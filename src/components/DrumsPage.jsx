import { useEffect, useReducer, useRef, useState } from 'react'
import { audioContext } from '../lib/audio.js'
import { DEFAULT_SOUND, SOUND_KEY } from '../lib/clickSounds.js'
import { METERS, clearSteps, historyReducer, sameLoop, setGrid, startHistory } from '../lib/drumEdit.js'
import { CLICKS, KITS, PERC_CREDIT, kitById, loadKit, loopVoices, playDrum, startDrumLoop } from '../lib/drumEngine.js'
import { LEVELS, LEVEL_NAMES, barCount, isValidLoop, loopTracks, meterLabel, voiceName } from '../lib/drumLoops.js'
import { PRESETS, STYLES, presetById, presetKit } from '../lib/drumPresets.js'
import { DEFAULT_METRONOME, METRONOME_KEY, metronomeSettings } from '../lib/rhythmView.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Choice, Field, Stepper } from './controls.jsx'
import DrumEditor from './DrumEditor.jsx'
import Metronome from './Metronome.jsx'
import './Drums.css'
import { Disclosure, PageHeader } from './layout.jsx'

const DEFAULT_LOOP = 'basic-rock'
const CURRENT_KEY = 'music.drums.current'

const meterOf = (loop) => METERS.find((m) => m.beats === loop.beats && m.steps === loop.steps)

function storedLoop() {
  try {
    const loop = JSON.parse(window.localStorage.getItem(CURRENT_KEY))
    if (isValidLoop(loop)) return loop
  } catch {
    // Nothing saved, or storage is off.
  }
  return null
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

const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName) || el?.isContentEditable

/** The plain metronome, for practice without a groove (the same one, and settings, the app has always had). */
function MetronomeMode() {
  const [stored, setStored] = usePersistentState(METRONOME_KEY, DEFAULT_METRONOME)
  const [sound, setSound] = usePersistentState(SOUND_KEY, DEFAULT_SOUND)
  const update = (patch) => setStored((s) => ({ ...DEFAULT_METRONOME, ...s, ...patch }))
  return <Metronome settings={metronomeSettings(stored)} update={update} sound={sound} onSoundChange={setSound} />
}

const MODES = [
  { value: 'groove', label: 'Groove' },
  { value: 'metronome', label: 'Metronome' },
]

/** Drums: play a groove on a recorded kit and edit it, or switch to a plain metronome. */
export default function DrumsPage() {
  const [mode, setMode] = usePersistentState('music.drums.mode', 'groove')
  return (
    <section className="page drums-page">
      <PageHeader title="Drums" summary="Play along with a groove on a real recorded kit, change any step, or use a plain metronome." />
      <Choice label="Play along with" hideLabel options={MODES} value={mode === 'metronome' ? 'metronome' : 'groove'} onChange={setMode} className="drums-mode" />
      {mode === 'metronome' ? <MetronomeMode /> : <GrooveMode />}
    </section>
  )
}

/** Grooves: pick a ready-made groove, change any step, and play it on a recorded kit. */
function GrooveMode() {
  const [loopId, setLoopId] = usePersistentState('music.drums.loop', DEFAULT_LOOP)
  const [bpm, setBpm] = usePersistentState('music.drums.bpm', presetById(DEFAULT_LOOP).bpm)
  const [style, setStyle] = usePersistentState('music.drums.style', 'All')
  const [volume, setVolume] = usePersistentState('music.drums.volume', 0.8)
  const [humanize, setHumanize] = usePersistentState('music.drums.humanize', 0)
  const [paint, setPaint] = usePersistentState('music.drums.paint', 'x')
  const [kitId, setKitId] = usePersistentState('music.drums.kit', presetKit(presetById(loopId)))
  const [click, setClick] = usePersistentState('music.drums.click', null)
  const [history, dispatch] = useReducer(historyReducer, null, () => startHistory(storedLoop() ?? presetById(loopId) ?? presetById(DEFAULT_LOOP)))
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [step, setStep] = useState(-1)
  const engine = useRef(null)
  const swingDrag = useRef(false)

  const loop = history.present
  const source = presetById(loopId)
  const edited = !sameLoop(loop, source)
  const kit = kitById(kitId)
  const clickVoice = CLICKS.some((c) => c.value === click) ? click : null
  const tempo = Number(bpm) >= 30 && Number(bpm) <= 300 ? Number(bpm) : loop.bpm
  const settings = { loop, kit: kit.id, bpm: tempo, volume, humanize, click: clickVoice }
  const edit = (next) => dispatch({ type: 'set', loop: next })
  const meter = meterOf(loop)

  // The groove being edited survives a reload.
  useEffect(() => {
    try {
      window.localStorage.setItem(CURRENT_KEY, JSON.stringify(loop))
    } catch {
      // Storage may be off; the groove just won't come back after a reload.
    }
  }, [loop])

  // Hear a step as you paint it (only while stopped, so it doesn't double up on the groove).
  const audition = (voice, level) => {
    if (playing) return
    loadKit(kit.id, [voice]).then(() => {
      const ac = audioContext()
      if (ac) playDrum(kit.id, voice, LEVELS[level], ac.currentTime, volume)
    }, () => {})
  }
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
    edit(preset)
    setBpm(preset.bpm)
    setKitId(presetKit(preset))
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
      if (isTyping(document.activeElement)) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && !e.altKey && (e.key === 'z' || e.key === 'Z' || e.key === 'y')) {
        e.preventDefault()
        dispatch({ type: e.key === 'y' || e.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (e.code !== 'Space' || e.repeat || e.target.closest?.('button, a, summary, [role="radio"]')) return
      e.preventDefault()
      latest.current.toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="stage drums-stage">
        <div className="drums-now">
          <h2>
            {source?.name ?? 'Groove'}
            {edited && <span className="edited-tag"> (edited)</span>}
            <small>
              {meterLabel(loop)}
              {barCount(loop) > 1 ? ` · ${barCount(loop)} bars` : ''}
              {loop.swing > 0.5 ? ` · swing ${Math.round(loop.swing * 100)}%` : ''}
            </small>
          </h2>
          <div className="drums-transport">
            <button type="button" className="primary play-button drums-play" onClick={toggle} aria-pressed={playing}>
              {playing ? (loading ? 'Loading…' : 'Stop') : 'Play'}
            </button>
            <Stepper label="Tempo (BPM)" value={bpm} onChange={setBpm} min={30} max={300} fallback={loop.bpm} className="tempo-field" />
            <Field label="Kit" className="drums-kit">
              <select value={kit.id} onChange={(e) => setKitId(e.target.value)}>
                {KITS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <DrumEditor
          loop={loop}
          paint={paint}
          onPaintChange={setPaint}
          onEdit={edit}
          onContinue={(next) => dispatch({ type: 'continue', loop: next })}
          onAudition={audition}
          playing={playing && !loading}
          current={step}
          toolbar={
            <span className="edit-actions">
              <button type="button" onClick={() => dispatch({ type: 'undo' })} disabled={!history.past.length} title="Undo (Ctrl+Z)">
                Undo
              </button>
              <button type="button" onClick={() => dispatch({ type: 'redo' })} disabled={!history.future.length} title="Redo (Ctrl+Shift+Z)">
                Redo
              </button>
              <button type="button" onClick={() => edit(clearSteps(loop))}>
                Clear
              </button>
              {edited && source && (
                <button type="button" onClick={() => edit(source)}>
                  Reset
                </button>
              )}
            </span>
          }
        />
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
                className={`preset-card${p.id === loopId ? ' is-loaded' : ''}`}
                aria-pressed={p.id === loopId}
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

      <Disclosure
        label="Settings"
        summary={[
          clickVoice ? `click: ${CLICKS.find((c) => c.value === clickVoice).label.toLowerCase()}` : null,
          meter?.id.replace('-8', '') ?? meterLabel(loop),
          `${barCount(loop)} bar${barCount(loop) > 1 ? 's' : ''}`,
          loop.swing > 0.5 ? `swing ${Math.round(loop.swing * 100)}%` : 'straight',
          humanize ? `humanize ${Math.round(humanize * 100)}%` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        storageKey="music.drums.settingsOpen"
      >
        <div className="field-grid">
          <Field label="Time signature">
            <select
              value={meter?.id ?? ''}
              onChange={(e) => {
                const m = METERS.find((x) => x.id === e.target.value)
                if (m) edit(setGrid(loop, m))
              }}
            >
              {!meter && <option value="">{meterLabel(loop)}</option>}
              {METERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Choice label="Bars" options={[1, 2, 4].map((b) => ({ value: b, label: String(b) }))} value={barCount(loop)} onChange={(bars) => edit(setGrid(loop, { bars }))} />
          <Field label={loop.steps === 3 ? 'Swing (already in the triplet grid)' : `Swing ${loop.swing > 0.5 ? `${Math.round(loop.swing * 100)}%` : 'off'}`}>
            <input
              type="range"
              min="0.5"
              max="0.75"
              step="0.01"
              value={loop.swing > 0.5 ? loop.swing : 0.5}
              disabled={loop.steps === 3}
              onChange={(e) => {
                // One drag of the slider is one undo step.
                dispatch({ type: swingDrag.current ? 'continue' : 'set', loop: { ...loop, swing: Number(e.target.value) > 0.505 ? Number(e.target.value) : 0 } })
                swingDrag.current = true
              }}
              onPointerUp={() => (swingDrag.current = false)}
              onKeyUp={() => (swingDrag.current = false)}
              onBlur={() => (swingDrag.current = false)}
            />
          </Field>
          <Field label={`Humanize ${humanize ? `${Math.round(humanize * 100)}%` : 'off'}`}>
            <input type="range" min="0" max="1" step="0.05" value={humanize} onChange={(e) => setHumanize(Number(e.target.value))} />
          </Field>
          <Choice label="Click on every beat" options={[{ value: null, label: 'Off' }, ...CLICKS]} value={clickVoice} onChange={setClick} />
          <Field label={`Volume ${Math.round(volume * 100)}%`}>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          </Field>
        </div>
        <p className="hint">Swing pushes every second 16th (or 8th) later, like a hip-hop or shuffle feel. Humanize adds a drummer’s small timing and loudness changes. The {kit.name.toLowerCase()} kit is {kit.detail}, recorded from {kit.credit}; hand percussion from {PERC_CREDIT}. All free (CC0).</p>
      </Disclosure>

      <p className="page-hint">Press a groove to load it, then change any step. Space plays and stops; Ctrl+Z undoes.</p>
    </>
  )
}
