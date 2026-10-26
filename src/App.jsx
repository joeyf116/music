import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Charts from './components/Charts.jsx'
import { Choice, Field, Stepper, Toggle } from './components/controls.jsx'
import Exercises from './components/Exercises.jsx'
import Fretboard from './components/Fretboard.jsx'
import PracticeTools from './components/PracticeTools.jsx'
import Quiz from './components/Quiz.jsx'
import Resources from './components/Resources.jsx'
import Tab from './components/Tab.jsx'
import TuningSelect from './components/TuningSelect.jsx'
import { playChord, playPitch } from './lib/audio.js'
import {
  CHORDS,
  INVERSION_CHORDS,
  INVERSION_NAMES,
  KEYS,
  SCALES,
  TUNINGS,
  chordInversions,
  chordVoicings,
  findPositions,
  intervalName,
  mod12,
  noteToPc,
  pcName,
  scaleAcrossNeck,
  scalePosition,
  usesFlats,
} from './lib/theory.js'
import useHashPage from './lib/useHashPage.js'
import usePersistentState from './lib/usePersistentState.js'
import './App.css'

const MODES = [
  { value: 'scale', label: 'Scales' },
  { value: 'chord', label: 'Chords' },
  { value: 'inversion', label: 'Inversions' },
]
const LABEL_OPTIONS = [
  { value: 'notes', label: 'Notes' },
  { value: 'intervals', label: 'Intervals' },
]
// In position = one vertical box; across the neck = a diagonal run that starts in that box and climbs through the next ones.
const LAYOUT_OPTIONS = [
  { value: 'position', label: 'In position' },
  { value: 'across', label: 'Across the neck' },
]
const INVERSION_SHORT = ['R', '1st', '2nd', '3rd']
const PAGES = [
  {
    id: 'fretboard',
    label: 'Fretboard',
    icon: <path d="M4 6h16M4 10h16M4 14h16M4 18h16M8 4v16M14 4v16" />,
  },
  {
    id: 'exercises',
    label: 'Exercises',
    icon: <path d="M9 3h6l3.5 18h-13ZM12 15l5-9M7.5 15h9" />,
  },
  {
    id: 'quiz',
    label: 'Quiz',
    icon: <path d="M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .9-1 1.6V14M12 17.5v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />,
  },
  {
    id: 'charts',
    label: 'Charts',
    icon: <path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9 9l11-2" />,
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" />,
  },
]
const ALL_POSITIONS = 'all'
const LEVELS = { faint: 0, path: 1, shape: 2, active: 3 }
const LEGEND = [
  ['root', 'Root'],
  ['third', '3rd'],
  ['fifth', '5th'],
  ['seventh', '7th'],
  ['other', 'Other'],
]

const minFret = (notes) => Math.min(...notes.map((n) => n.fret))
const fretRange = (notes) => {
  const frets = notes.map((n) => n.fret)
  const lo = Math.min(...frets)
  const hi = Math.max(...frets)
  return lo === hi ? `fr ${lo}` : `fr ${lo}–${hi}`
}
const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)

export default function App() {
  const page = useHashPage(PAGES.map((p) => p.id), 'fretboard')
  const [key, setKey] = usePersistentState('music.key', 'A')
  const [mode, setMode] = usePersistentState('music.mode', 'scale')
  const [scaleType, setScaleType] = usePersistentState('music.scale', 'minorPentatonic')
  const [chordType, setChordType] = usePersistentState('music.chord', 'maj')
  const [inversionType, setInversionType] = usePersistentState('music.inversionChord', 'maj')
  const [tuningId, setTuningId] = usePersistentState('music.tuning', 'standard')
  const [labels, setLabels] = usePersistentState('music.labels', 'notes')
  const [showAll, setShowAll] = usePersistentState('music.showAll', true)
  const [layout, setLayout] = usePersistentState('music.scaleLayout', 'position')
  const [bpm, setBpm] = usePersistentState('music.bpm', 100)
  const [position, setPosition] = useState(0)
  const [stringSet, setStringSet] = useState(0)
  const [active, setActive] = useState(null)
  const [playing, setPlaying] = useState(false)
  const timers = useRef([])

  const safeKey = KEYS.includes(key) ? key : 'C'
  const rootPc = noteToPc(safeKey)
  const flats = usesFlats(safeKey)
  const tuningSpec = TUNINGS[tuningId] ?? TUNINGS.standard
  const tuning = tuningSpec.pitches
  const scale = SCALES[scaleType] ?? SCALES.major
  const chord = CHORDS[chordType] ?? CHORDS.maj
  const inversionChord = CHORDS[INVERSION_CHORDS.includes(inversionType) ? inversionType : 'maj']
  const formula = mode === 'scale' ? scale : mode === 'chord' ? chord : inversionChord
  const intervals = formula.intervals
  const chordName = `${safeKey}${formula.symbol ?? ''}`

  const view = useMemo(() => {
    if (mode === 'scale') {
      // "All" always walks the box shapes; the layout only changes how a single position is played.
      const all = position === ALL_POSITIONS
      const shapeOf = layout === 'across' && !all ? scaleAcrossNeck : scalePosition
      const positions = intervals.map((_, degree) => shapeOf(rootPc, intervals, tuning, degree))
      const options = [
        ...positions.map((p, i) => ({ label: layout === 'across' && !all ? `From pos. ${i + 1}` : `Position ${i + 1}`, hint: fretRange(p) })),
        { label: 'All', hint: 'whole neck' },
      ]
      if (all) {
        // Every position in one view: the tab climbs the neck one shape at a time (each ascending, labelled like
        // its button), and the neck lights the shape being played so you always know which box you're in.
        const order = positions.map((notes, i) => ({ notes, i, lo: Math.min(...notes.map((n) => n.fret)) })).sort((a, b) => a.lo - b.lo)
        return {
          options,
          optionIndex: positions.length,
          path: findPositions(tuning, intervals.map((i) => rootPc + i)),
          columns: order.flatMap(({ notes, i }, k) => notes.map((n, j) => ({ notes: [n], shape: notes, heading: j === 0 ? `Position ${i + 1} · ${fretRange(notes)}` : undefined, groupStart: j === 0 && k > 0 }))),
          columnWidth: 28,
          defaultActive: null,
          shape: null,
          all: true,
        }
      }
      const index = Math.min(position, positions.length - 1)
      const notes = positions[index]
      const run = [...notes, ...notes.slice(0, -1).reverse()]
      return {
        options,
        optionIndex: index,
        path: [],
        columns: run.map((n) => ({ notes: [n] })),
        columnWidth: 28,
        defaultActive: null,
        shape: notes,
      }
    }
    if (mode === 'chord') {
      const voicings = chordVoicings(rootPc, intervals, tuning)
      return {
        options: [],
        path: [],
        columns: voicings.map((v) => ({ notes: v.notes, label: chordName, sublabel: v.notes.some((n) => n.fret === 0) ? 'open' : `fr ${minFret(v.notes)}` })),
        columnWidth: 70,
        defaultActive: 0,
      }
    }
    const sets = chordInversions(rootPc, intervals, tuning)
    const index = Math.min(stringSet, sets.length - 1)
    const set = sets[index]
    const stringNumber = (s) => tuning.length - s
    return {
      options: sets.map((s) => ({ label: `Strings ${s.strings.map(stringNumber).reverse().join('-')}`, hint: '' })),
      optionIndex: index,
      path: set.shapes.flatMap((s) => s.notes),
      columns: set.shapes.map((s, i) => ({ notes: s.notes, label: INVERSION_SHORT[s.inversion], sublabel: `fr ${minFret(s.notes)}`, groupStart: i === 0 })),
      columnWidth: 70,
      defaultActive: 0,
    }
  }, [mode, intervals, rootPc, tuning, position, stringSet, chordName, layout])

  const selection = [mode, safeKey, scaleType, chordType, inversionType, tuningId, view.optionIndex, layout].join('|')
  const activeIndex = active?.selection === selection && active.index < view.columns.length ? active.index : view.defaultActive
  const activeColumn = activeIndex === null ? null : view.columns[activeIndex]

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPlaying(false)
  }, [])
  useEffect(() => stop, [selection, page, stop])

  const playColumn = (col) => {
    const pitches = col.notes.map((n) => tuning[n.string] + n.fret)
    if (pitches.length === 1) playPitch(pitches[0])
    else playChord(pitches)
  }

  const selectColumn = (index, play = true) => {
    setActive({ selection, index })
    if (play && view.columns[index]) playColumn(view.columns[index])
  }

  const togglePlay = () => {
    if (playing) return stop()
    const beat = (60 / Math.max(30, Math.min(300, Number(bpm) || 100))) * 1000 * (mode === 'scale' ? 1 : 2)
    setPlaying(true)
    timers.current = view.columns.map((col, i) =>
      setTimeout(() => {
        setActive({ selection, index: i })
        playColumn(col)
      }, i * beat),
    )
    timers.current.push(setTimeout(() => setPlaying(false), view.columns.length * beat))
  }

  // Arrow keys step through the tab one column at a time.
  const stepRef = useRef(null)
  useEffect(() => {
    stepRef.current = (delta) => {
      if (page !== 'fretboard' || !view.columns.length) return
      const current = activeIndex ?? -1
      selectColumn((current + delta + view.columns.length) % view.columns.length)
    }
  })
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(document.activeElement)) return
      if (e.key === 'ArrowRight') stepRef.current?.(1)
      if (e.key === 'ArrowLeft') stepRef.current?.(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const intervalOfPc = (pc) => intervals.find((i) => mod12(rootPc + i) === mod12(pc))
  const noteLabel = (n) => (labels === 'intervals' ? intervalName(n.interval, intervals) : pcName(tuning[n.string] + n.fret, flats))

  const fretboardNotes = (() => {
    const map = new Map()
    const add = (n, level) => {
      const id = `${n.string}-${n.fret}`
      const existing = map.get(id)
      if (!existing || LEVELS[level] > LEVELS[existing.level]) map.set(id, { string: n.string, fret: n.fret, interval: n.interval ?? intervalOfPc(tuning[n.string] + n.fret), level })
    }
    if (showAll) findPositions(tuning, intervals.map((i) => rootPc + i)).forEach((n) => add(n, 'faint'))
    view.path.forEach((n) => add(n, 'path'))
    view.shape?.forEach((n) => add(n, 'shape'))
    // All positions: every note is shown; until a note plays, all of them read as one full-strength neck.
    if (view.all) (activeColumn?.shape ?? view.path).forEach((n) => add(n, 'shape'))
    activeColumn?.notes.forEach((n) => add(n, mode === 'scale' ? 'active' : 'shape'))
    return [...map.values()].sort((a, b) => LEVELS[a.level] - LEVELS[b.level])
  })()

  const columns = view.columns.map((c) => (mode === 'scale' ? { ...c, label: noteLabel(c.notes[0]) } : c))
  // Open strings follow the tuning's own spelling (Eb standard reads Eb, not D#), otherwise the key's.
  const stringName = (s) => pcName(tuning[s], tuningSpec.flats ?? flats)
  const tuningNames = tuning.map((_, s) => (s === tuning.length - 1 ? stringName(s).toLowerCase() : stringName(s)))
  const title = mode === 'scale' ? `${safeKey} ${scale.name}` : mode === 'chord' ? `${chordName} – ${chord.name}` : `${chordName} inversions`
  const typeOptions = mode === 'scale' ? SCALES : mode === 'chord' ? CHORDS : Object.fromEntries(INVERSION_CHORDS.map((id) => [id, CHORDS[id]]))
  const typeValue = mode === 'scale' ? scaleType : mode === 'chord' ? chordType : inversionType
  const setType = mode === 'scale' ? setScaleType : mode === 'chord' ? setChordType : setInversionType

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="#fretboard">
          <span aria-hidden="true">🎸</span> Fretboard Practice
        </a>
        {/* Phones get this as a bottom tab bar (in thumb reach, never over the top of the page); wider screens show it inline. */}
        <nav className="page-nav" aria-label="Pages">
          {PAGES.map((p) => (
            <a key={p.id} href={`#${p.id}`} aria-current={page === p.id ? 'page' : undefined} onClick={() => page === p.id && window.scrollTo(0, 0)}>
              <svg className="page-icon" viewBox="0 0 24 24" aria-hidden="true">
                {p.icon}
              </svg>
              <span>{p.label}</span>
            </a>
          ))}
        </nav>
      </header>

      <main>
        {page === 'resources' ? (
          <Resources />
        ) : page === 'exercises' ? (
          <Exercises tuning={tuning} tuningId={tuningId} onTuningChange={setTuningId} stringName={stringName} />
        ) : page === 'charts' ? (
          <Charts tuning={tuning} tuningId={tuningId} onTuningChange={setTuningId} />
        ) : page === 'quiz' ? (
          <Quiz tuning={tuning} tuningId={tuningId} onTuningChange={setTuningId} stringName={stringName} />
        ) : (
          <section className="panel fretboard-panel">
            <div className="field-grid fretboard-controls">
              <Choice label="Show" options={MODES} value={mode} onChange={setMode} />
              <Field label={mode === 'scale' ? 'Scale' : 'Chord'}>
                <select value={typeValue} onChange={(e) => setType(e.target.value)}>
                  {Object.entries(typeOptions).map(([id, t]) => (
                    <option key={id} value={id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tuning">
                <TuningSelect value={tuningId} onChange={setTuningId} />
              </Field>
              {mode === 'scale' && !view.all && <Choice label="Layout" options={LAYOUT_OPTIONS} value={layout === 'across' ? 'across' : 'position'} onChange={setLayout} />}
              <Choice label="Note labels" options={LABEL_OPTIONS} value={labels} onChange={setLabels} />
              {!view.all && (
                <Toggle checked={showAll} onChange={setShowAll}>
                  Show every note on the neck
                </Toggle>
              )}
            </div>

            <span className="field-label key-label" id="fretboard-key-label">
              Key
            </span>
            <div className="keys" role="group" aria-labelledby="fretboard-key-label">
              {KEYS.map((k) => (
                <button key={k} className={k === safeKey ? 'on' : ''} onClick={() => setKey(k)} aria-pressed={k === safeKey}>
                  {k}
                </button>
              ))}
            </div>

            <div className="title-row">
              <h2>{title}</h2>
              <ul className="chips" aria-label="Notes">
                {intervals.map((i) => (
                  <li key={i} className={`chip ${i === 0 ? 'root' : ''}`}>
                    <strong>{pcName(rootPc + i, flats)}</strong>
                    <span>{intervalName(i, intervals)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Fretboard tuning={tuning} notes={fretboardNotes} label={noteLabel} stringName={stringName} onNoteClick={(n) => playPitch(tuning[n.string] + n.fret)} />

            <ul className="legend">
              {LEGEND.map(([role, text]) => (
                <li key={role}>
                  <span className={`swatch ${role}`} /> {text}
                </li>
              ))}
            </ul>

            {view.options.length > 0 && (
              <div className="options" role="group" aria-label={mode === 'scale' ? 'Scale position' : 'String set'}>
                {view.options.map((o, i) => (
                  <button key={o.label} className={i === view.optionIndex ? 'on' : ''} onClick={() => (mode === 'scale' ? setPosition(i === view.options.length - 1 ? ALL_POSITIONS : i) : setStringSet(i))}>
                    {o.label}
                    {o.hint && <small>{o.hint}</small>}
                  </button>
                ))}
              </div>
            )}

            <div className="tab-head">
              <h3>
                Tab
                <small>
                  {mode === 'scale' && (view.all ? 'every position, up the neck' : layout === 'across' ? 'climbing across the neck & back' : 'ascending & descending')}
                  {mode === 'chord' && 'voicings up the neck'}
                  {mode === 'inversion' && `${INVERSION_NAMES.slice(0, intervals.length).join(' → ')} moving up the neck`}
                </small>
              </h3>
              <div className="playback">
                <Stepper label="BPM" value={bpm} onChange={setBpm} min={30} max={300} step={5} fallback={100} className="bpm-field" />
                <button className="primary" onClick={togglePlay} disabled={!view.columns.length}>
                  {playing ? '■ Stop' : '▶ Play'}
                </button>
                <PracticeTools bpm={bpm} dronePitch={40 + mod12(rootPc - 4)} droneName={safeKey} />
              </div>
            </div>
            <Tab columns={columns} tuningNames={tuningNames} columnWidth={view.columnWidth} active={activeIndex} onSelect={(i) => selectColumn(i)} />
            <p className="hint">Click a tab column or fretboard note to hear it · ← / → step through the tab.</p>
          </section>
        )}
      </main>
    </div>
  )
}
