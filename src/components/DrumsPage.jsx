import { useEffect, useReducer, useRef, useState } from 'react'
import { audioContext } from '../lib/audio.js'
import { DEFAULT_SOUND, SOUND_KEY } from '../lib/clickSounds.js'
import { METERS, clearSteps, historyReducer, sameLoop, setGrid, startHistory } from '../lib/drumEdit.js'
import { CLICKS, KITS, PERC_CREDIT, kitById, loadKit, loopVoices, playDrum } from '../lib/drumEngine.js'
import { LEVELS, LEVEL_NAMES, barCount, isValidLoop, loopTracks, meterLabel, voiceName } from '../lib/drumLoops.js'
import { PRESETS, STYLES, presetById, presetKit } from '../lib/drumPresets.js'
import { NAME_MAX, SAVED_KEY, SAVED_STYLE, findGroove, removeSaved, saveGroove, updateSaved, validSaved } from '../lib/drumSaved.js'
import { DEFAULT_METRONOME, METRONOME_KEY, metronomeSettings } from '../lib/rhythmView.js'
import usePersistentState from '../lib/usePersistentState.js'
import { CURRENT_GROOVE_KEY as CURRENT_KEY } from '../lib/practiceBacking.js'
import { usePlayer } from '../lib/usePlayer.jsx'
import { Choice, Field, Stepper } from './controls.jsx'
import DrumEditor from './DrumEditor.jsx'
import Menu from './Menu.jsx'
import Metronome from './Metronome.jsx'
import './Drums.css'
import { Disclosure, PageHeader } from './layout.jsx'

const DEFAULT_LOOP = 'basic-rock'
// The step editor starts open where there's room for it, folded on phones (it remembers what you choose).
const WIDE = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 720px)').matches

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
  // The metronome shares the app's one tempo with the grooves and the practice tab.
  const player = usePlayer()
  const update = ({ bpm, ...patch }) => {
    if (bpm !== undefined) player.setBpm(bpm)
    if (Object.keys(patch).length) setStored((s) => ({ ...DEFAULT_METRONOME, ...s, ...patch }))
  }
  return <Metronome settings={{ ...metronomeSettings(stored), bpm: player.bpm }} update={update} sound={sound} onSoundChange={setSound} onStart={player.stopAll} />
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
  const [storedSaved, setSaved] = usePersistentState(SAVED_KEY, [])
  const saved = validSaved(storedSaved)
  const [naming, setNaming] = useState(null)
  // One tempo for the whole app: picking a groove sets it to the groove's own tempo.
  const player = usePlayer()
  const { bpm, setBpm, groove } = player
  const [storedStyle, setStyle] = usePersistentState('music.drums.style', null)
  const [volume, setVolume] = usePersistentState('music.drums.volume', 0.8)
  const [humanize, setHumanize] = usePersistentState('music.drums.humanize', 0)
  const [paint, setPaint] = usePersistentState('music.drums.paint', 'x')
  const [kitId, setKitId] = usePersistentState('music.drums.kit', presetKit(presetById(loopId)))
  const [click, setClick] = usePersistentState('music.drums.click', null)
  const [history, dispatch] = useReducer(historyReducer, null, () => startHistory(storedLoop() ?? presetById(loopId) ?? presetById(DEFAULT_LOOP)))
  // The groove plays in the app-wide player, so it keeps going on other pages.
  const { playing, loading, failed } = groove
  const step = groove.step
  const swingDrag = useRef(false)
  const row = useRef(null)

  const loop = history.present
  const source = findGroove(loopId, saved)
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
  // The style row starts on the loaded groove's style; 'All' (older versions) does too.
  const styles = saved.length ? [SAVED_STYLE, ...STYLES] : STYLES
  const style = styles.includes(storedStyle) ? storedStyle : styles.includes(source?.style) ? source.style : STYLES[0]
  const shown = style === SAVED_STYLE ? saved : PRESETS.filter((p) => p.style === style)
  const mine = source?.style === SAVED_STYLE

  // Save the groove as it is now (steps, kit and tempo) under a name.
  const saveAs = (e) => {
    e.preventDefault()
    const { list, groove: made } = saveGroove(saved, loop, { name: naming, kit: kit.id, bpm: tempo })
    setSaved(list)
    setLoopId(made.id)
    setStyle(SAVED_STYLE)
    setNaming(null)
  }
  const saveChanges = () => setSaved(updateSaved(saved, loopId, loop, { kit: kit.id, bpm: tempo }))
  const deleteSaved = (g) => {
    if (!window.confirm(`Delete “${g.name}”? This can’t be undone.`)) return
    setSaved(removeSaved(saved, g.id))
    if (g.id === loopId) setLoopId(DEFAULT_LOOP)
  }
  // On phones the row scrolls sideways: show the loaded groove when the row changes (never scrolls the page).
  useEffect(() => {
    const el = row.current
    const card = el?.querySelector('.is-loaded')?.parentElement
    if (el && card && el.scrollWidth > el.clientWidth) el.scrollLeft = card.offsetLeft - el.offsetLeft
  }, [style])

  // Warm up the drums of the loaded groove so the first Play starts at once.
  useEffect(() => {
    loadKit(kit.id, loopVoices(loop)).catch(() => {})
  }, [kit.id, loop])

  const grooveName = `${source?.name ?? 'Groove'}${edited ? ' (edited)' : ''}`
  // Edits, tempo and kit changes reach the playing groove at once (also when it's backing the practice tab).
  useEffect(() => {
    if (playing) player.updateGroove(settings, grooveName)
  })

  const stop = () => player.stopGroove()
  const start = () => player.playGroove(settings, grooveName)

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
      <div className="drums-main">
        <section className="drums-presets" aria-label="Grooves">
          <div className="chips drum-styles" role="radiogroup" aria-label="Style">
            {styles.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={style === s} className={`chip${style === s ? ' on' : ''}`} onClick={() => setStyle(s)}>
                {s}
              </button>
            ))}
          </div>
          <ul className="preset-grid" aria-label={`${style} grooves`} ref={row}>
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
                {p.style === SAVED_STYLE && (
                  <Menu label={`${p.name} actions`} className="saved-menu" items={[{ label: 'Delete this groove', destructive: true, onSelect: () => deleteSaved(p) }]}>
                    ⋯
                  </Menu>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="drums-player">
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
            <Disclosure
              label="Edit steps"
              summary={`${loopTracks(loop).length} drums${edited ? ' · edited' : ''}`}
              storageKey="music.drums.editOpen"
              defaultOpen={WIDE}
              className="drum-edit"
            >
              {naming !== null && (
                <form className="save-groove" onSubmit={saveAs}>
                  <Field label="Name">
                    <input value={naming} onChange={(e) => setNaming(e.target.value)} maxLength={NAME_MAX} autoFocus enterKeyHint="done" />
                  </Field>
                  <button type="submit" className="primary">
                    Save
                  </button>
                  <button type="button" onClick={() => setNaming(null)}>
                    Cancel
                  </button>
                </form>
              )}
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
                    {edited && mine && (
                    <button type="button" onClick={saveChanges}>
                      Save changes
                    </button>
                  )}
                  <button type="button" onClick={() => setNaming(naming === null ? (mine ? `${source.name} 2` : `${source?.name ?? 'My'} groove`.replace(' groove groove', ' groove')) : null)} aria-expanded={naming !== null}>
                    {mine ? 'Save as…' : 'Save…'}
                  </button>
                  {edited && source && (
                      <button type="button" onClick={() => edit(source)}>
                        Reset
                      </button>
                    )}
                  </span>
                }
              />
            </Disclosure>
            {failed && (
              <p className="error" role="alert">
                The drum sounds didn’t load. Check your connection and press Play again.
              </p>
            )}
          </div>
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
        </div>
      </div>



      <p className="page-hint">Press a groove to play it, then open Edit steps to change it. Space plays and stops; Ctrl+Z undoes.</p>
    </>
  )
}
