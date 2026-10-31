import { useEffect, useRef, useState } from 'react'
import { clampBpm, fitAccents, gapStatus } from '../lib/rhythm.js'
import { startClickTrack } from '../lib/rhythmEngine.js'
import useTapJudge from '../lib/useTapJudge.js'
import { Choice, Stepper } from './controls.jsx'
import TapPad, { TapResults } from './TapPad.jsx'
import { Disclosure } from './layout.jsx'

// How much of the click you get. Less click = more of the time is yours to keep.
const CLICK_MODES = [
  { value: 'full', label: 'Every beat', title: 'Click on every beat' },
  { value: 'one', label: 'Beat 1 only', title: 'Only the first beat of each bar clicks' },
  { value: 'backbeat', label: '2 & 4', title: 'Only the backbeat clicks, like a drummer’s snare' },
  { value: 'gap', label: 'Gaps', title: 'Two bars of click, then two bars of silence' },
]

const accentsFor = (mode, accents) => {
  if (mode === 'one') return accents.map((a, i) => (i === 0 ? 'accent' : 'mute'))
  if (mode === 'backbeat') return accents.map((a, i) => (i % 2 === 1 ? 'accent' : 'mute'))
  return accents
}

const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)

/** Tap along with the click and see how early or late each tap lands, and whether you rush or drag overall. */
export default function TimingTest({ settings, update, sound }) {
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState('full')
  const [pulse, setPulse] = useState(null)
  const [correction, setCorrection] = useState(() => Number(settings.tapCorrection) || 0)
  const judge = useTapJudge(Number(correction) || 0)
  const engine = useRef(null)
  const bpm = clampBpm(settings.bpm)
  const accents = accentsFor(mode, fitAccents(settings.accents, settings.meter))
  const gap = mode === 'gap' ? { on: true, play: 2, mute: 2 } : { on: false }
  const engineSettings = useRef(null)
  const latest = { ...settings, bpm, accents, sound, subdivision: 'beats', gap, speed: { on: false }, countIn: true }
  const { addTarget, clearTargets } = judge
  // Keep the running engine (and the next start) on the latest settings; changes apply from the next click.
  useEffect(() => {
    engineSettings.current = latest
    engine.current?.update(latest)
  })

  useEffect(() => {
    if (!playing) return
    clearTargets()
    engine.current = startClickTrack(engineSettings.current, { onPulse: setPulse, onBeatScheduled: addTarget })
    return () => {
      engine.current?.stop()
      engine.current = null
      setPulse(null)
    }
  }, [playing, addTarget, clearTargets])

  // Space starts and stops; while running, any letter key (or Enter on the pad) is a tap.
  const keyRef = useRef(null)
  useEffect(() => {
    keyRef.current = (e) => {
      if (isTyping(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      if (e.key === ' ' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (playing && /^[a-z]$/i.test(e.key)) {
        judge.tap(e)
      }
    }
  })
  useEffect(() => {
    const onKey = (e) => keyRef.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const status = pulse?.bar < 0 ? `Count-in ${pulse.beat + 1}… start tapping on 1` : pulse ? gapStatus(pulse.bar, gap) || `Bar ${pulse.bar + 1} · beat ${pulse.beat + 1}` : ''

  return (
    <div className="timing-test">
      <p className="lead">
        Tap on <strong>every beat</strong>, including the silent ones. Each tap shows how early or late it landed; the summary tells you if you tend to rush or drag. Under 25 ms is as tight as most ears can hear.
      </p>
      <div className="field-grid">
        <Choice label="Click" options={CLICK_MODES} value={mode} onChange={setMode} className="click-mode" />
        <Stepper label="BPM" value={settings.bpm} onChange={(v) => update({ bpm: v })} min={30} max={300} step={5} fallback={90} className="tempo-field" />
      </div>
      <div className="metronome-transport">
        <button type="button" className="primary play-button big-play" onClick={() => setPlaying(!playing)} aria-pressed={playing}>
          {playing ? '■ Stop' : '▶ Start'}
        </button>
        <span className="transport-status" aria-live="polite">
          {status}
        </span>
      </div>
      <div className="mini-lights" aria-hidden="true">
        {accents.map((level, i) => (
          <span key={i} className={`level-${level}${pulse?.beat === i ? (pulse.audible === false || level === 'mute' ? ' ghost' : ' lit') : ''}`} />
        ))}
      </div>
      <TapPad judge={judge} disabled={!playing} idle={playing ? 'Tap here on every beat' : 'Press Start, then tap here on every beat'} />
      <p className="hint keys-hint">On a keyboard: Space starts and stops, any letter key taps.</p>
      <TapResults judge={judge} onReset={judge.reset} />
      <Disclosure label="Taps always read late?" quiet className="option-panel">
        <p className="hint">Bluetooth headphones and some speakers add a delay the browser can’t see. Tap a run at a slow tempo, then set the average you get here so it’s taken off every tap.</p>
        <Stepper label="Delay correction (ms)" value={correction} onChange={(v) => {
            setCorrection(v)
            update({ tapCorrection: Number(v) || 0 })
          }} min={0} max={300} step={5} fallback={0} />
      </Disclosure>
    </div>
  )
}
