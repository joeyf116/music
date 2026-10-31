import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { clampBpm } from '@music/rhythm.js'
import type { Pulse } from '@music/rhythmEngine.js'
import { CLICK_MODES, clickModeAccents, clickModeGap, timingStatus, type ClickMode } from '@music/rhythmView.js'
import useTapJudge from '@/lib/useTapJudge'
import { colors, space, text } from '@/theme'
import { Button, Disclosure, Hint, Notice, Segmented, Stepper } from '../ui'
import { useClickTrack, type MetronomeProps } from './Metronome'
import TapPad, { TapResults } from './TapPad'

const MODE_OPTIONS = CLICK_MODES.map((m) => ({ value: m.value, label: m.label }))

/** Tap along with the click and see how early or late each tap lands, and whether you rush or drag overall. */
export default function TimingTest({ settings, update, sound }: Omit<MetronomeProps, 'onSoundChange'>) {
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<ClickMode>('full')
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const judge = useTapJudge(Number(settings.tapCorrection) || 0)
  const { addTarget, clearTargets } = judge
  const bpm = clampBpm(settings.bpm)
  const accents = clickModeAccents(mode, settings.accents)
  const gap = clickModeGap(mode)

  useEffect(() => {
    if (playing) clearTargets()
  }, [playing, clearTargets])
  useClickTrack(playing, { ...settings, bpm, accents, sound, subdivision: 'beats', gap, speed: { on: false }, countIn: true }, { onPulse: setPulse, onBeatScheduled: addTarget })

  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>
        Tap on <Text style={styles.strong}>every beat</Text>, including the silent ones. Each tap shows how early or late it landed; the summary tells you if you tend to rush or drag. Under 25 ms is as tight as most ears can hear.
      </Text>
      <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode} />
      <View style={styles.transport}>
        <Stepper label="BPM" value={settings.bpm} onChange={(v) => update({ bpm: v })} min={30} max={300} step={5} />
        <Button primary title={playing ? 'Stop' : 'Start'} onPress={() => {
            setPulse(null)
            setPlaying(!playing)
          }} style={styles.play} />
      </View>
      <Notice>{timingStatus(pulse, gap) || ' '}</Notice>
      <View style={styles.lights} importantForAccessibility="no-hide-descendants">
        {accents.map((level, i) => {
          const lit = pulse?.beat === i
          return <View key={i} style={[styles.light, level === 'accent' && styles.accent, level === 'mute' && styles.mute, lit && (pulse.audible === false || level === 'mute' ? styles.ghost : styles.lit)]} />
        })}
      </View>
      <TapPad judge={judge} disabled={!playing} idle={playing ? 'Tap here on every beat' : 'Press Start, then tap here on every beat'} />
      <TapResults judge={judge} />
      <Disclosure title="Taps always read late?">
        <Hint>Bluetooth headphones and some speakers add a delay the app can’t see. Tap a run at a slow tempo, then set the average you get here so it’s taken off every tap.</Hint>
        <View style={styles.correction}>
          <Stepper label="DELAY (MS)" value={settings.tapCorrection} onChange={(v) => update({ tapCorrection: v })} min={0} max={300} step={5} />
        </View>
      </Disclosure>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  lead: { color: colors.text, fontSize: text.base, lineHeight: 22, paddingHorizontal: space[4] },
  strong: { fontWeight: '700' },
  transport: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] },
  play: { flex: 1, minHeight: 52 },
  lights: { flexDirection: 'row', justifyContent: 'center', gap: space[2] },
  light: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.borderStrong },
  accent: { borderColor: colors.accent },
  mute: { borderStyle: 'dashed', opacity: 0.5 },
  lit: { backgroundColor: colors.accent, borderColor: colors.accent },
  ghost: { backgroundColor: colors.surface2, borderColor: colors.text },
  correction: { paddingHorizontal: space[4], alignItems: 'flex-start' },
})
