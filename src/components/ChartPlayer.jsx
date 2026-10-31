import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { STYLE_IDS, STYLES } from '../lib/arranger.js'
import { CHANNELS, playBand } from '../lib/band.js'
import { ALL_KEYS, compileChart, isMinorKey, keyDistance, transposeChart, transposeKey } from '../lib/chart.js'
import { CHANNEL_LABELS, DEFAULT_MIX, bandStatus, transposeText } from '../lib/chartView.js'
import usePersistentState from '../lib/usePersistentState.js'
import { barSymbols } from '../lib/voicings.js'
import ChartSheet from './ChartSheet.jsx'
import ChordReference from './ChordReference.jsx'
import { Field, Stepper, Toggle } from './controls.jsx'
import { Disclosure } from './layout.jsx'

const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName) || el?.isContentEditable

/** Transpose / tempo / style controls, the band mixer and the chart itself, lit up while the band plays. */
export default function ChartPlayer({ chart, keyboard = true, tuning, tuningId, onTuningChange }) {
  const [key, setKey] = useState(chart.key)
  const [tempo, setTempo] = useState(chart.tempo)
  const [style, setStyle] = useState(chart.style)
  const [loop, setLoop] = usePersistentState('music.chartLoop', true)
  const [countIn, setCountIn] = usePersistentState('music.chartCountIn', true)
  const [mix, setMix] = usePersistentState('music.bandMix', DEFAULT_MIX)
  const [muted, setMuted] = usePersistentState('music.bandMuted', [])
  const [playing, setPlaying] = useState(false)
  const [activeBar, setActiveBar] = useState(null)
  const [count, setCount] = useState(null)
  const [startBar, setStartBar] = useState(0)
  const id = useId()
  const band = useRef(null)
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
  const bpm = Math.max(40, Math.min(300, Number(tempo) || chart.tempo))
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

  const toggle = () => (band.current ? stop() : start())
  const toggleRef = useRef(toggle)
  useEffect(() => {
    toggleRef.current = toggle
  })
  useEffect(() => {
    if (!keyboard) return
    const onKey = (e) => {
      if (e.code !== 'Space' || isTyping(document.activeElement) || e.target.closest?.('button')) return
      e.preventDefault()
      toggleRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard])

  const keyOptions = ALL_KEYS.filter((k) => isMinorKey(k) === isMinorKey(chart.key))
  const shift = keyDistance(chart.key, shown.key)
  const transposeBy = (n) => setKey(transposeKey(shown.key, n))

  return (
    <div className="chart-player">
      <div className="band-transport">
        <button type="button" className="primary play-band" onClick={toggle} disabled={!totalBars} aria-pressed={playing}>
          {playing ? '■ Stop' : '▶ Play'}
        </button>
        <span className="band-status" aria-live="polite">
          {bandStatus({ count, activeBar, startBar, totalBars })}
        </span>
        <div className="toggles">
          <Toggle checked={loop} onChange={setLoop}>
            Loop
          </Toggle>
          <Toggle checked={countIn} onChange={setCountIn}>
            Count-in
          </Toggle>
        </div>
      </div>

      <div className="field-grid band-controls">
        <div className="field">
          <span className="field-label" id={`${id}-key`}>
            Key
          </span>
          <div className="transpose">
            <button type="button" onClick={() => transposeBy(-1)} aria-label="Key down a half step" title="Down a half step">
              −
            </button>
            <select value={shown.key} onChange={(e) => setKey(e.target.value)} aria-labelledby={`${id}-key`}>
              {keyOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                  {k === chart.key ? ' (original)' : ''}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => transposeBy(1)} aria-label="Key up a half step" title="Up a half step">
              +
            </button>
          </div>
        </div>
        <div className="tempo-control">
          <Stepper label="Tempo (BPM)" value={tempo} onChange={setTempo} min={40} max={300} step={5} fallback={chart.tempo} />
          <input type="range" className="tempo-slider" min="40" max="300" value={bpm} onChange={(e) => setTempo(Number(e.target.value))} aria-label="Tempo slider" />
        </div>
        <Field label="Style">
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            {STYLE_IDS.map((sid) => (
              <option key={sid} value={sid}>
                {STYLES[sid].name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Disclosure label="Band mix" summary={muted.length ? `${muted.map((m) => CHANNEL_LABELS[m]).join(', ')} off` : 'Drums, bass and piano on'} storageKey="music.bandMixOpen" className="band-mix">
        <div className="band-mixer" role="group" aria-label="Band mixer">
          {CHANNELS.map((c) => {
            const off = muted.includes(c)
            return (
              <div key={c} className={`mixer-channel${off ? ' muted' : ''}`}>
                <button type="button" className={off ? '' : 'on'} aria-pressed={!off} onClick={() => setMuted(off ? muted.filter((m) => m !== c) : [...muted, c])}>
                  {CHANNEL_LABELS[c]}
                </button>
                <input type="range" min="0" max="1" step="0.05" value={mix[c] ?? DEFAULT_MIX[c]} onChange={(e) => setMix({ ...mix, [c]: Number(e.target.value) })} aria-label={`${CHANNEL_LABELS[c]} volume`} />
              </div>
            )
          })}
        </div>
      </Disclosure>

      <ChordReference chart={shown} playingSymbols={activeBar === null ? [] : symbolsByBar[activeBar] ?? []} tuning={tuning} tuningId={tuningId} onTuningChange={onTuningChange} />
      {shift !== 0 && <p className="hint">{transposeText(shift, chart.key)}</p>}
      <ChartSheet
        chart={shown}
        activeBar={activeBar}
        startBar={startBar}
        onBarClick={(bar) => {
          if (band.current) start(bar, false)
          else setStartBar(bar === startBar ? 0 : bar)
        }}
      />
      <p className="hint">Tap a bar to start from there (tap it again to go back to the top) · Space plays and stops.</p>
    </div>
  )
}
