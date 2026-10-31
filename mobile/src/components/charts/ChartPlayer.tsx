import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { STYLES, STYLE_IDS } from '@music/arranger.js'
import { CHANNELS, playBand, type Band } from '@music/band.js'
import { ALL_KEYS, compileChart, isMinorKey, keyDistance, transposeChart, transposeKey, type Chart } from '@music/chart.js'
import { CHANNEL_LABELS, DEFAULT_MIX, bandStatus, transposeText, type Channel } from '@music/chartView.js'
import { barSymbols } from '@music/voicings.js'
import { useStored } from '@/lib/prefs'
import { colors, space, text } from '@/theme'
import { Button, ChoiceRow, Disclosure, Group, HeaderButton, Hint, SliderRow, Stepper, SwitchRow, TempoSlider } from '../ui'
import ChartSheet from './ChartSheet'
import ChordShapes from './ChordShapes'

export const CHARTS_SHEET = '/charts/choose'
const STYLE_SECTIONS = [{ options: STYLE_IDS.map((id) => ({ value: id, label: STYLES[id].name })) }]
const clampTempo = (n: number, fallback: number) => Math.max(40, Math.min(300, Number(n) || fallback))

/** Key / tempo / style controls, the band mixer, chord shapes and the chart itself, lit up while the band plays. */
export default function ChartPlayer({ chart }: { chart: Chart }) {
  const [key, setKey] = useState(chart.key)
  const [tempo, setTempo] = useState(chart.tempo)
  const [style, setStyle] = useState(chart.style)
  const [loop, setLoop] = useStored('music.chartLoop', true)
  const [countIn, setCountIn] = useStored('music.chartCountIn', true)
  const [mix, setMix] = useStored<Record<Channel, number>>('music.bandMix', DEFAULT_MIX)
  const [muted, setMuted] = useStored<Channel[]>('music.bandMuted', [])
  const [playing, setPlaying] = useState(false)
  const [activeBar, setActiveBar] = useState<number | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [startBar, setStartBar] = useState(0)
  const band = useRef<Band | null>(null)
  const position = useRef(0)

  // The editor changing the chart's key, tempo or style resets the player to match.
  const [synced, setSynced] = useState(chart)
  if (synced.key !== chart.key || synced.tempo !== chart.tempo || synced.style !== chart.style) {
    setSynced(chart)
    if (synced.key !== chart.key) setKey(chart.key)
    if (synced.tempo !== chart.tempo) setTempo(chart.tempo)
    if (synced.style !== chart.style) setStyle(chart.style)
  }

  const shown = useMemo(() => transposeChart(chart, ALL_KEYS.includes(key) && isMinorKey(key) === isMinorKey(chart.key) ? key : chart.key), [chart, key])
  const song = useMemo(() => compileChart(shown), [shown])
  const volumes = useMemo(() => Object.fromEntries(CHANNELS.map((c) => [c, muted.includes(c) ? 0 : (mix[c] ?? DEFAULT_MIX[c])])), [mix, muted])
  const bpm = clampTempo(tempo, chart.tempo)
  const totalBars = song.bars.length
  const symbolsByBar = useMemo(() => barSymbols(song), [song])

  const stop = () => {
    band.current?.stop()
    band.current = null
    setPlaying(false)
    setActiveBar(null)
    setCount(null)
  }

  const start = (from = startBar, withCount = countIn) => {
    band.current?.stop()
    band.current = playBand(song, {
      bpm,
      style,
      volumes,
      loop,
      countIn: withCount,
      startBar: Math.min(from, totalBars - 1),
      onBar: (bar, beat) => {
        if (bar === 'count') return setCount(beat + 1)
        position.current = bar
        setCount(null)
        setActiveBar(bar)
      },
      onEnd: () => stop(),
    })
    setPlaying(true)
  }

  // Changing the key, style, loop or the chart itself restarts the band from the bar it's on.
  const restartKey = `${style}|${loop}|${JSON.stringify(song)}`
  const lastRestart = useRef(restartKey)
  useEffect(() => {
    if (lastRestart.current === restartKey) return
    lastRestart.current = restartKey
    if (band.current) start(position.current, false)
  })
  useEffect(() => band.current?.setVolumes(volumes), [volumes])
  useEffect(() => band.current?.setTempo(bpm), [bpm])
  useEffect(() => () => band.current?.stop(), [])

  const keySections = [{ options: ALL_KEYS.filter((k) => isMinorKey(k) === isMinorKey(chart.key)).map((k) => ({ value: k, label: k === chart.key ? `${k} (original)` : k })) }]
  const shift = keyDistance(chart.key, shown.key)
  const mixSummary = muted.length ? `${muted.map((m) => CHANNEL_LABELS[m]).join(', ')} off` : 'Drums, bass and piano on'

  return (
    <View style={styles.wrap}>
      <View style={styles.transport}>
        <Button primary title={playing ? 'Stop' : 'Play'} onPress={() => (band.current ? stop() : start())} disabled={!totalBars} style={styles.play} />
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {bandStatus({ count, activeBar, startBar, totalBars })}
        </Text>
      </View>

      <Group>
        <View style={styles.keyRow}>
          <HeaderButton ios="minus.circle" android="remove_circle" label="Key down a half step" onPress={() => setKey(transposeKey(shown.key, -1))} />
          <View style={styles.flex}>
            <ChoiceRow label="Key" value={shown.key} sections={keySections} onChange={setKey} sheet={CHARTS_SHEET} />
          </View>
          <HeaderButton ios="plus.circle" android="add_circle" label="Key up a half step" onPress={() => setKey(transposeKey(shown.key, 1))} />
        </View>
        <ChoiceRow label="Style" value={style} sections={STYLE_SECTIONS} onChange={setStyle} sheet={CHARTS_SHEET} />
        <SwitchRow label="Loop" value={loop} onChange={setLoop} />
        <SwitchRow label="Count-in" value={countIn} onChange={setCountIn} last />
      </Group>
      {shift !== 0 ? <Hint>{transposeText(shift, chart.key)}</Hint> : null}

      <View style={styles.tempo}>
        <Stepper label="BPM" value={bpm} onChange={setTempo} min={40} max={300} step={5} />
        <View style={styles.flex}>
          <TempoSlider value={bpm} onChange={setTempo} min={40} />
        </View>
      </View>

      <Disclosure title="Band mix" summary={mixSummary}>
        <Group>
          {CHANNELS.map((c, i) => {
            const off = muted.includes(c)
            return (
              <View key={c}>
                <SwitchRow label={CHANNEL_LABELS[c]} value={!off} onChange={(on) => setMuted(on ? muted.filter((m) => m !== c) : [...muted, c])} first={i === 0} />
                <SliderRow
                  label={`${CHANNEL_LABELS[c]} volume`}
                  value={mix[c] ?? DEFAULT_MIX[c]}
                  onChange={(v) => setMix({ ...mix, [c]: v })}
                  min={0}
                  max={1}
                  step={0.05}
                  disabled={off}
                  format={(v) => `${Math.round(v * 100)}%`}
                  last={i === CHANNELS.length - 1}
                />
              </View>
            )
          })}
        </Group>
      </Disclosure>

      <ChordShapes chart={shown} playingSymbols={activeBar === null ? [] : (symbolsByBar[activeBar] ?? [])} sheet={CHARTS_SHEET} />

      <ChartSheet
        chart={shown}
        activeBar={activeBar}
        startBar={startBar}
        onBarPress={(bar) => {
          if (band.current) start(bar, false)
          else setStartBar(bar === startBar ? 0 : bar)
        }}
      />
      <Hint>Tap a bar to start from there. Tap it again to go back to the top.</Hint>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  transport: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] },
  play: { minWidth: 120, minHeight: 52 },
  status: { flex: 1, color: colors.muted, fontSize: text.sm },
  keyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2] },
  flex: { flex: 1 },
  tempo: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] },
})
