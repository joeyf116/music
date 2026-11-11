import { useEffect, useRef, useState } from 'react'
import { KITS, loadKit, loopVoices, startDrumLoop } from '../lib/drumEngine.js'
import { LEVEL_NAMES, countLabel, loopTracks, meterLabel, voiceById } from '../lib/drumLoops.js'
import { PRESETS, STYLES, presetById } from '../lib/drumPresets.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Field, Stepper } from './controls.jsx'
import './Drums.css'
import { Disclosure, PageHeader } from './layout.jsx'

const DEFAULT_LOOP = 'basic-rock'
const voiceName = (id, short) => {
  const v = voiceById(id)
  return (short && v.short) || v.name
}

/** One loop drawn small, a box per beat with a cell per step (the preset gallery). */
function MiniGrid({ loop }) {
  return (
    <div className="mini-grid" aria-hidden="true">
      {loopTracks(loop).map((t) => (
        <div className="mini-row" key={t.voice}>
          <span className="mini-name">{voiceName(t.voice, true)}</span>
          <span className="mini-beats">
            {Array.from({ length: loop.beats }, (_, b) => (
              <span className="mini-beat" key={b}>
                {Array.from(t.steps.slice(b * loop.steps, (b + 1) * loop.steps)).map((c, i) => (
                  <span key={i} className={`mini-step lv-${c === '.' ? 'off' : LEVEL_NAMES[c]}`} />
                ))}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}

/** The loaded loop, big, with the step being heard lit up. */
function LoopGrid({ loop, playing, current }) {
  return (
    <div className="loop-grid" role="table" aria-label={`${loop.name}, drum by drum`}>
      {loopTracks(loop).map((t) => (
        <div className="loop-row" role="row" key={t.voice}>
          <span className="loop-name" role="rowheader">
            {voiceName(t.voice, true)}
          </span>
          <span className="loop-steps" style={{ '--beats': loop.beats }}>
            {Array.from({ length: loop.beats }, (_, b) => (
              <span className="loop-beat" key={b} style={{ '--steps': loop.steps }}>
                {Array.from(t.steps.slice(b * loop.steps, (b + 1) * loop.steps)).map((c, i) => {
                  const step = b * loop.steps + i
                  const level = c === '.' ? null : LEVEL_NAMES[c]
                  return (
                    <span
                      role="cell"
                      key={i}
                      className={`loop-step lv-${level ?? 'off'}${playing && current === step ? ' now' : ''}`}
                      aria-label={level ? `${countLabel(loop, step)}: ${level}` : undefined}
                    >
                      {level === 'accent' && <span aria-hidden="true">›</span>}
                    </span>
                  )
                })}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}

const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName) || el?.isContentEditable

/** Drums: pick a ready-made groove and play it on a recorded kit. */
export default function DrumsPage() {
  const [loopId, setLoopId] = usePersistentState('music.drums.loop', DEFAULT_LOOP)
  const [bpm, setBpm] = usePersistentState('music.drums.bpm', presetById(DEFAULT_LOOP).bpm)
  const [style, setStyle] = usePersistentState('music.drums.style', 'All')
  const [volume, setVolume] = usePersistentState('music.drums.volume', 0.8)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [step, setStep] = useState(-1)
  const engine = useRef(null)

  const loop = presetById(loopId) ?? presetById(DEFAULT_LOOP)
  const kit = KITS[0]
  const tempo = Number(bpm) >= 30 && Number(bpm) <= 300 ? Number(bpm) : loop.bpm
  const settings = { loop, kit: kit.id, bpm: tempo, volume }
  const shown = style === 'All' ? PRESETS : PRESETS.filter((p) => p.style === style)

  // Warm up the drums of the loaded groove so the first Play starts at once.
  useEffect(() => {
    loadKit(kit.id, loopVoices(loop)).catch(() => {})
  }, [kit.id, loop])

  useEffect(() => {
    engine.current?.update(settings)
  })

  const stop = () => {
    engine.current?.stop()
    engine.current = null
    setPlaying(false)
    setLoading(false)
    setStep(-1)
  }

  const start = () => {
    engine.current?.stop()
    setFailed(false)
    setLoading(true)
    setPlaying(true)
    const e = startDrumLoop(settings, { onStep: setStep })
    engine.current = e
    e.loaded.then(
      () => engine.current === e && setLoading(false),
      () => {
        if (engine.current !== e) return
        stop()
        setFailed(true)
      },
    )
  }

  const toggle = () => (playing ? stop() : start())

  // Pressing a groove plays it straight away (once the new groove has rendered, so it starts with its sound).
  const [autoplay, setAutoplay] = useState(0)
  const pick = (preset) => {
    setLoopId(preset.id)
    setBpm(preset.bpm)
    if (!playing) setAutoplay((n) => n + 1)
  }
  const latest = useRef({})
  useEffect(() => {
    latest.current = { start, toggle }
  })
  useEffect(() => {
    if (autoplay) latest.current.start()
  }, [autoplay])

  useEffect(() => () => engine.current?.stop(), [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || e.repeat || isTyping(document.activeElement) || e.target.closest?.('button, a, summary, [role="radio"]')) return
      e.preventDefault()
      latest.current.toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <section className="page drums-page">
      <PageHeader title="Drums" summary="Pick a groove and play along on a real recorded drum kit." />

      <div className="stage drums-stage">
        <div className="drums-now">
          <h2>
            {loop.name}
            <small>
              {loop.style} · {meterLabel(loop)}
              {loop.swing > 0.5 ? ` · swing ${Math.round(loop.swing * 100)}%` : ''}
            </small>
          </h2>
          <div className="drums-transport">
            <button type="button" className="primary play-button drums-play" onClick={toggle} aria-pressed={playing}>
              {playing ? (loading ? 'Loading…' : 'Stop') : 'Play'}
            </button>
            <Stepper label="Tempo (BPM)" value={bpm} onChange={setBpm} min={30} max={300} fallback={loop.bpm} className="tempo-field" />
          </div>
        </div>
        <LoopGrid loop={loop} playing={playing && !loading} current={step} />
        {failed && (
          <p className="error" role="alert">
            The drum sounds didn’t load. Check your connection and press Play again.
          </p>
        )}
      </div>

      <section className="drums-presets" aria-labelledby="drum-presets-title">
        <div className="section-title">
          <h2 id="drum-presets-title">Grooves</h2>
        </div>
        <div className="chips drum-styles" role="radiogroup" aria-label="Style">
          {['All', ...STYLES].map((s) => (
            <button key={s} type="button" role="radio" aria-checked={style === s} className={`chip${style === s ? ' on' : ''}`} onClick={() => setStyle(s)}>
              {s}
            </button>
          ))}
        </div>
        <ul className="preset-grid">
          {shown.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`preset-card${p.id === loop.id ? ' is-loaded' : ''}`}
                aria-pressed={p.id === loop.id}
                aria-label={`${p.name}, ${meterLabel(p)}, ${p.bpm} BPM`}
                onClick={() => pick(p)}
              >
                <span className="preset-head">
                  <strong>{p.name}</strong>
                  <small>
                    {meterLabel(p)} · {p.bpm} bpm
                  </small>
                </span>
                <MiniGrid loop={p} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Disclosure label="Settings" summary={`${kit.name} kit · volume ${Math.round(volume * 100)}%`} storageKey="music.drums.settingsOpen">
        <div className="field-grid">
          <Field label="Kit">
            <select value={kit.id} disabled>
              {KITS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}: {k.detail}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Volume ${Math.round(volume * 100)}%`}>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          </Field>
        </div>
        <p className="hint">Recorded from {kit.credit}. More kits for other styles are on the way.</p>
      </Disclosure>

      <p className="page-hint">Press a groove to hear it. Space plays and stops.</p>
    </section>
  )
}
