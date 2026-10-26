import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  scalePosition,
  usesFlats,
} from './lib/theory.js'
import useHashPage from './lib/useHashPage.js'
import usePersistentState from './lib/usePersistentState.js'
import './App.css'

const MODES = [
  { id: 'scale', label: 'Scales' },
  { id: 'chord', label: 'Chords' },
  { id: 'inversion', label: 'Inversions' },
]
const INVERSION_SHORT = ['R', '1st', '2nd', '3rd']
const PAGES = [
  { id: 'fretboard', label: 'Fretboard' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'resources', label: 'Resources' },
]
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
  const [bpm, setBpm] = usePersistentState('music.bpm', 100)
  const [position, setPosition] = useState(0)
  const [stringSet, setStringSet] = useState(0)
  const [active, setActive] = useState(null)
  const [playing, setPlaying] = useState(false)
  const timers = useRef([])
  const headerRef = useRef(null)

  // Publish the sticky header's height so scrolling to a focused field or anchor stops below it.
  useEffect(() => {
    const header = headerRef.current
    if (!header || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`)
    })
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  // On phones the header tucks away while scrolling down and comes back on any scroll up,
  // so it never sits over the content being read (the CSS only applies this on narrow screens).
  const [tucked, setTucked] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - last) < 8) return
      setTucked(y > last && y > (headerRef.current?.offsetHeight ?? 0))
      last = y
    }
    const show = () => setTucked(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('hashchange', show)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hashchange', show)
    }
  }, [])

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
      const positions = intervals.map((_, degree) => scalePosition(rootPc, intervals, tuning, degree))
      const index = Math.min(position, positions.length - 1)
      const notes = positions[index]
      const run = [...notes, ...notes.slice(0, -1).reverse()]
      return {
        options: positions.map((p, i) => ({ label: `Position ${i + 1}`, hint: fretRange(p) })),
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
  }, [mode, intervals, rootPc, tuning, position, stringSet, chordName])

  const selection = [mode, safeKey, scaleType, chordType, inversionType, tuningId, view.optionIndex].join('|')
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
      <header className={`site-header${tucked ? ' tucked' : ''}`} ref={headerRef} onFocus={() => setTucked(false)}>
        <h1>
          <span aria-hidden="true">🎸</span> Fretboard Practice
        </h1>
        <nav aria-label="Pages">
          {PAGES.map((p) => (
            <a key={p.id} href={`#${p.id}`} aria-current={page === p.id ? 'page' : undefined} onClick={() => page === p.id && window.scrollTo(0, 0)}>
              {p.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {page === 'resources' ? (
          <Resources />
        ) : page === 'quiz' ? (
          <Quiz tuning={tuning} tuningId={tuningId} onTuningChange={setTuningId} stringName={stringName} />
        ) : (
          <section className="panel fretboard-panel">
            <div className="controls">
              <div className="segmented" role="tablist" aria-label="Mode">
                {MODES.map((m) => (
                  <button key={m.id} role="tab" aria-selected={mode === m.id} className={mode === m.id ? 'on' : ''} onClick={() => setMode(m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>
              <label>
                {mode === 'scale' ? 'Scale' : 'Chord'}
                <select value={typeValue} onChange={(e) => setType(e.target.value)}>
                  {Object.entries(typeOptions).map(([id, t]) => (
                    <option key={id} value={id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tuning
                <TuningSelect value={tuningId} onChange={setTuningId} />
              </label>
              <div className="segmented small" aria-label="Note labels">
                <button className={labels === 'notes' ? 'on' : ''} onClick={() => setLabels('notes')}>
                  Notes
                </button>
                <button className={labels === 'intervals' ? 'on' : ''} onClick={() => setLabels('intervals')}>
                  Intervals
                </button>
              </div>
              <label className="check">
                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                Show all notes on neck
              </label>
            </div>

            <div className="keys" role="group" aria-label="Key">
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
                  <button key={o.label} className={i === view.optionIndex ? 'on' : ''} onClick={() => (mode === 'scale' ? setPosition(i) : setStringSet(i))}>
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
                  {mode === 'scale' && 'ascending & descending'}
                  {mode === 'chord' && 'voicings up the neck'}
                  {mode === 'inversion' && `${INVERSION_NAMES.slice(0, intervals.length).join(' → ')} moving up the neck`}
                </small>
              </h3>
              <div className="playback">
                <label>
                  BPM
                  <input type="number" min="30" max="300" value={bpm} onChange={(e) => setBpm(e.target.value)} />
                </label>
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
