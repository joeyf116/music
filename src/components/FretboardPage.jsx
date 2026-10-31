import { useCallback, useEffect, useRef, useState } from 'react'
import { playChord, playPitch } from '../lib/audio.js'
import { DEFAULT_SETTINGS, LAYOUTS, NECK_AREAS, PROGRESSIONS, parseProgression, randomProgression, voiceProgression } from '../lib/exercises.js'
import {
  CHORDS,
  DROP_VOICINGS,
  INVERSION_CHORDS,
  INVERSION_NAMES,
  SCALES,
  chordInversions,
  chordVoicings,
  diatonicChords,
  findPositions,
  intervalName,
  mod12,
  noteToPc,
  pcName,
  scaleAcrossNeck,
  scalePosition,
  sevenNoteScale,
  spellInterval,
  spellNotes,
  usesFlats,
} from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Choice, Field, Stepper, Toggle } from './controls.jsx'
import DiatonicChords from './DiatonicChords.jsx'
import Fretboard from './Fretboard.jsx'
import KeyPicker from './KeyPicker.jsx'
import PracticeTools from './PracticeTools.jsx'
import Tab from './Tab.jsx'
import TuningSelect from './TuningSelect.jsx'

// One switch for what the neck shows. Everything else on the page follows from the key, the scale and this.
const VIEWS = [
  { value: 'scale', label: 'Scale', title: 'The scale in each position, or the whole neck' },
  { value: 'chord', label: 'Chords', title: 'Full chord shapes up the neck for a chord in the key' },
  { value: 'inversion', label: 'Inversions', title: 'Triads and drop-2 / drop-3 7th chords on each string set' },
  { value: 'progression', label: 'Progressions', title: 'A chord progression in the key, voiced close together' },
]
const VIEW_IDS = VIEWS.map((v) => v.value)
const LABEL_OPTIONS = [
  { value: 'notes', label: 'Notes' },
  { value: 'intervals', label: 'Intervals' },
]
const LAYOUT_OPTIONS = Object.entries(LAYOUTS).map(([value, l]) => ({ value, label: l.name, title: l.title }))
const DROP_OPTIONS = Object.entries(DROP_VOICINGS).map(([value, d]) => ({ value, label: d.name, title: d.title }))
const AREA_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'middle', label: 'Fret 5' },
  { value: 'high', label: 'Fret 8' },
]
const INVERSION_SHORT = ['R', '1st', '2nd', '3rd']
// Chord types with a clean inversion system on adjacent strings (every chord a seven-note scale can build is here).
const INVERSION_TYPES = [...INVERSION_CHORDS, 'augMaj7']
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
const shapeHint = (notes) => (!notes.length ? '' : notes.some((n) => n.fret === 0) ? 'open' : `fr ${minFret(notes)}`)
// The voicing searches are the only slow part of the page; remember recent results so stepping through the tab is instant.
const cache = new Map()
const remember = (key, compute) => {
  if (!cache.has(key)) {
    if (cache.size > 200) cache.clear()
    cache.set(key, compute())
  }
  return cache.get(key)
}
const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)
// A chord from the key's strip as a progression writes it (♭VII → bVII; the parser has no +maj7, so III+ stands in).
const progressionToken = (chord) => chord.numeral.replace('♭', 'b').replace('♯', '#').replace('+maj7', '+')

// Opens the Exercises page on a drill that matches what the neck shows. Exercises reads its settings when it opens.
const openExercise = (settings) => {
  try {
    const stored = JSON.parse(window.localStorage.getItem('music.exercises') ?? 'null') ?? DEFAULT_SETTINGS
    window.localStorage.setItem('music.exercises', JSON.stringify({ ...stored, ...settings }))
    // The drills live on the Rhythm page's "Fretboard" tab.
    window.localStorage.setItem('music.rhythmTab', JSON.stringify('drills'))
  } catch {
    // No storage: Exercises opens on whatever it showed last.
  }
  window.location.hash = 'exercises'
  window.scrollTo(0, 0)
}

/**
 * The Fretboard page. Three questions, top to bottom: which key and scale, what to look at (scale, chords, inversions
 * or a progression), and which one of those (a position, a chord in the key, a string set). The neck and its tab follow.
 */
export default function FretboardPage({ keyName, onKeyChange, scaleType, onScaleChange, tuning, tuningSpec, tuningId, onTuningChange, bpm, onBpmChange }) {
  const [storedView, setView] = usePersistentState('music.mode', 'scale')
  const [chordDegree, setChordDegree] = usePersistentState('music.chordDegree', 0)
  const [chordOverride, setChordOverride] = usePersistentState('music.chordType', '')
  const [sevenths, setSevenths] = usePersistentState('music.diatonicSevenths', false)
  const [drop, setDrop] = usePersistentState('music.dropVoicing', 'drop2')
  const [labels, setLabels] = usePersistentState('music.labels', 'notes')
  const [showAll, setShowAll] = usePersistentState('music.showAll', true)
  const [layout, setLayout] = usePersistentState('music.scaleLayout', 'position')
  const [position, setPosition] = usePersistentState('music.fretPosition', 0)
  const [stringSet, setStringSet] = usePersistentState('music.stringSet', 0)
  const [progression, setProgression] = usePersistentState('music.fretProgression', 'I V vi IV')
  const [area, setArea] = usePersistentState('music.progressionNeck', 'open')
  const [active, setActive] = useState(null)
  const [playing, setPlaying] = useState(false)
  const timers = useRef([])

  const view = VIEW_IDS.includes(storedView) ? storedView : 'scale'
  const keyPc = noteToPc(keyName)
  const scale = SCALES[scaleType] ?? SCALES.major
  const scaleSpelling = spellNotes(keyName, scale.intervals, true)
  const modeId = sevenNoteScale(scaleType)

  // Chords and inversions are picked from the key: the strip chooses the chord (ii, V…), the type can be changed.
  const diatonic = diatonicChords(keyName, scaleType, sevenths)
  const picked = diatonic[Math.min(Math.max(0, Number(chordDegree) || 0), diatonic.length - 1)]
  const overrideOk = CHORDS[chordOverride] && (view !== 'inversion' || INVERSION_TYPES.includes(chordOverride))
  const chordType = overrideOk ? chordOverride : INVERSION_TYPES.includes(picked.type) || view !== 'inversion' ? picked.type : 'maj'
  const chordDef = CHORDS[chordType]
  const chordSpelling = spellNotes(picked.rootName, chordDef.intervals)
  const chordName = `${picked.rootName}${chordDef.symbol}`
  const isFourNote = chordDef.intervals.length === 4

  // A progression is read token by token so each chord keeps the numeral it was written as.
  const progressionChords = progression
    .split(/[\s,|–—-]+/)
    .filter(Boolean)
    .map((token) => ({ token, chord: parseProgression(token, keyName).chords[0] }))
  const badTokens = progressionChords.filter((c) => !c.chord).map((c) => c.token)
  const goodChords = progressionChords.filter((c) => c.chord)

  const formula = view === 'scale' ? { rootPc: keyPc, intervals: scale.intervals, names: scaleSpelling.names, rootName: scaleSpelling.root } : { rootPc: picked.rootPc, intervals: chordDef.intervals, names: chordSpelling.names, rootName: picked.rootName }
  const { rootPc, intervals } = formula

  // React Compiler memoizes this per input, so the voicing search only reruns when the selection changes.
  const shapes = (() => {
    if (view === 'scale') {
      // "All" always walks the box shapes; the fingering only changes how a single position is played.
      const all = position === ALL_POSITIONS
      const diagonal = layout === 'across' && !all
      const positions = intervals.map((_, degree) => scalePosition(rootPc, intervals, tuning, degree))
      const options = [...positions.map((p, i) => ({ label: `Position ${i + 1}`, hint: fretRange(p) })), { label: 'All', hint: 'whole neck' }]
      if (all) {
        // The tab climbs the neck one shape at a time, and the neck lights the shape being played.
        const order = positions.map((notes, i) => ({ notes, i, lo: minFret(notes) })).sort((a, b) => a.lo - b.lo)
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
      const index = Math.min(Number(position) || 0, positions.length - 1)
      const notes = diagonal ? scaleAcrossNeck(rootPc, intervals, tuning, index) : positions[index]
      const run = [...notes, ...notes.slice(0, -1).reverse()]
      return { options, optionIndex: index, path: [], columns: run.map((n) => ({ notes: [n] })), columnWidth: 28, defaultActive: null, shape: notes }
    }
    if (view === 'chord') {
      const voicings = remember(`v|${rootPc}|${intervals}|${tuning}`, () => chordVoicings(rootPc, intervals, tuning))
      return {
        options: [],
        path: [],
        columns: voicings.map((v) => ({ notes: v.notes, label: chordName, sublabel: shapeHint(v.notes) })),
        columnWidth: 70,
        defaultActive: 0,
      }
    }
    if (view === 'inversion') {
      const sets = chordInversions(rootPc, intervals, tuning, drop)
      const index = Math.min(Number(stringSet) || 0, sets.length - 1)
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
    }
    const chords = goodChords.map((c) => c.chord)
    const voicings = remember(`p|${keyName}|${progression}|${tuning}|${area}`, () => voiceProgression(chords, tuning, area))
    return {
      options: [],
      path: [],
      columns: chords.map((chord, i) => ({ notes: voicings[i], chord, label: chord.name, sublabel: shapeHint(voicings[i]), groupStart: i > 0 && i % 4 === 0 })),
      columnWidth: 70,
      defaultActive: chords.length ? 0 : null,
    }
  })()

  const selection = [view, keyName, scaleType, chordName, tuningId, shapes.optionIndex, layout, drop, progression, area].join('|')
  const activeIndex = active?.selection === selection && active.index < shapes.columns.length ? active.index : shapes.defaultActive
  const activeColumn = activeIndex === null ? null : shapes.columns[activeIndex]

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPlaying(false)
  }, [])
  useEffect(() => stop, [selection, stop])

  const playColumn = (col) => {
    const pitches = col.notes.map((n) => tuning[n.string] + n.fret)
    if (pitches.length === 1) playPitch(pitches[0])
    else if (pitches.length) playChord(pitches)
  }

  const selectColumn = (index, play = true) => {
    setActive({ selection, index })
    if (play && shapes.columns[index]) playColumn(shapes.columns[index])
  }

  const togglePlay = () => {
    if (playing) return stop()
    const beat = (60 / Math.max(30, Math.min(300, Number(bpm) || 100))) * 1000 * (view === 'scale' ? 1 : view === 'progression' ? 4 : 2)
    setPlaying(true)
    timers.current = shapes.columns.map((col, i) =>
      setTimeout(() => {
        setActive({ selection, index: i })
        playColumn(col)
      }, i * beat),
    )
    timers.current.push(setTimeout(() => setPlaying(false), shapes.columns.length * beat))
  }

  // Arrow keys step through the tab one column at a time.
  const stepRef = useRef(null)
  useEffect(() => {
    stepRef.current = (delta) => {
      if (!shapes.columns.length) return
      const current = activeIndex ?? -1
      selectColumn((current + delta + shapes.columns.length) % shapes.columns.length)
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

  // ---- What the neck shows ----
  const flats = usesFlats(formula.rootName)
  const nameOfPc = new Map(intervals.map((i, k) => [mod12(rootPc + i), formula.names[k]]))
  const intervalOfPc = (pc) => intervals.find((i) => mod12(rootPc + i) === mod12(pc))
  const progressionChord = view === 'progression' ? (activeColumn?.chord ?? shapes.columns[0]?.chord) : null

  const noteLabel = (n) => {
    // Progression notes carry their own name and degree, read against their own chord.
    if (n.degree !== undefined) return labels === 'intervals' ? n.degree : (n.name ?? pcName(tuning[n.string] + n.fret, flats))
    return labels === 'intervals' ? intervalName(n.interval, intervals) : (nameOfPc.get(mod12(tuning[n.string] + n.fret)) ?? pcName(tuning[n.string] + n.fret, flats))
  }

  const fretboardNotes = (() => {
    const map = new Map()
    const add = (n, level) => {
      const id = `${n.string}-${n.fret}`
      const existing = map.get(id)
      if (existing && LEVELS[level] <= LEVELS[existing.level]) return
      const note = { string: n.string, fret: n.fret, level }
      if (n.degree !== undefined) Object.assign(note, { degree: n.degree, name: n.name })
      else note.interval = n.interval ?? intervalOfPc(tuning[n.string] + n.fret)
      map.set(id, note)
    }
    if (showAll && !shapes.all) {
      if (progressionChord) {
        // Every tone of the chord being played, so you can see where else it lives on the neck.
        findPositions(tuning, progressionChord.intervals.map((i) => progressionChord.rootPc + i)).forEach((n) => {
          const interval = mod12(tuning[n.string] + n.fret - progressionChord.rootPc)
          add({ ...n, degree: intervalName(interval, progressionChord.intervals), name: spellInterval(progressionChord.rootName, interval, progressionChord.intervals) }, 'faint')
        })
      } else findPositions(tuning, intervals.map((i) => rootPc + i)).forEach((n) => add(n, 'faint'))
    }
    shapes.path.forEach((n) => add(n, 'path'))
    shapes.shape?.forEach((n) => add(n, 'shape'))
    // All positions: until a note plays, every note reads as one full-strength neck.
    if (shapes.all) (activeColumn?.shape ?? shapes.path).forEach((n) => add(n, 'shape'))
    activeColumn?.notes.forEach((n) => add(n, view === 'scale' ? 'active' : 'shape'))
    return [...map.values()].sort((a, b) => LEVELS[a.level] - LEVELS[b.level])
  })()

  const columns = shapes.columns.map((c) => (view === 'scale' ? { ...c, label: noteLabel(c.notes[0]) } : c))
  // Open strings follow the tuning's own spelling (Eb standard reads Eb, not D#), otherwise the key's.
  const stringName = (s) => pcName(tuning[s], tuningSpec.flats ?? usesFlats(keyName))
  const tuningNames = tuning.map((_, s) => (s === tuning.length - 1 ? stringName(s).toLowerCase() : stringName(s)))

  // ---- Headings ----
  const keyTitle = `${scaleSpelling.root} ${scale.name}`
  const heading = {
    scale: { title: keyTitle, sub: shapes.all ? 'whole neck' : `${layout === 'across' ? 'diagonal from ' : ''}position ${shapes.optionIndex + 1}` },
    chord: { title: chordName, sub: `${picked.numeral} in ${keyName} · ${chordDef.name}` },
    inversion: { title: `${chordName} inversions`, sub: `${picked.numeral} in ${keyName} · ${isFourNote ? DROP_VOICINGS[drop].name : 'close triads'}` },
    progression: { title: `Progression in ${keyName}`, sub: goodChords.length ? `${goodChords.length} chords` : 'add some chords' },
  }[view]
  const chips =
    view === 'progression'
      ? goodChords.map((c, i) => ({ key: i, name: c.chord.name, sub: c.token, root: false, on: activeIndex === i, index: i }))
      : intervals.map((i, k) => ({ key: i, name: formula.names[k], sub: intervalName(i, intervals), root: i === 0 }))
  const tabNote = {
    scale: shapes.all ? 'every position, up the neck' : layout === 'across' ? 'up the neck & back' : 'ascending & descending',
    chord: 'voicings up the neck',
    inversion: `${INVERSION_NAMES.slice(0, intervals.length).join(' → ')} moving up the neck`,
    progression: 'one chord per bar, voiced close together',
  }[view]

  // Picking a chord in the key: it is played the way the neck then shows it (its first voicing or inversion).
  const pendingPlay = useRef(false)
  useEffect(() => {
    if (!pendingPlay.current) return
    pendingPlay.current = false
    if (shapes.columns[0]) playColumn(shapes.columns[0])
  })
  const pickChord = (chord) => {
    if (view === 'progression') {
      setProgression(`${progression.trim()} ${progressionToken(chord)}`.trim())
      return
    }
    if (chord.degree === picked.degree && !overrideOk) {
      if (shapes.columns[0]) selectColumn(0)
      return
    }
    pendingPlay.current = true
    setChordDegree(chord.degree)
    setChordOverride('')
  }

  const drill = () => {
    if (view === 'scale') openExercise({ exercise: 'scaleSequence', position: shapes.all ? 0 : shapes.optionIndex, layout })
    else if (view === 'progression') openExercise({ exercise: 'progression', progression: goodChords.map((c) => c.token).join(' ') || 'I V vi IV', sevenths: false })
    else if (view === 'inversion' && !isFourNote) openExercise({ exercise: 'triadSets', stringSet: shapes.optionIndex, scale7: modeId })
    else openExercise({ exercise: 'diatonicArpeggios', arpSize: isFourNote ? 'sevenths' : 'triads', scale7: modeId })
  }
  const drillName = { scale: 'Scale sequences', chord: 'Arpeggios through the key', inversion: isFourNote ? 'Arpeggios through the key' : 'Triads on a string set', progression: 'Strum this progression' }[view]

  const typeOptions = Object.entries(CHORDS).filter(([id]) => view !== 'inversion' || INVERSION_TYPES.includes(id))
  const settingsSummary = [tuningSpec.name, labels === 'notes' ? 'note names' : 'intervals', showAll ? 'all notes' : 'shape only'].join(' · ')

  return (
    <section className="panel fretboard-panel">
      {/* 1. Where you are: key and scale, shared with Exercises. */}
      <div className="explore-key">
        <KeyPicker value={keyName} onChange={onKeyChange} />
        <Field label="Scale / mode" className="scale-field">
          <select value={scaleType} onChange={(e) => onScaleChange(e.target.value)}>
            {Object.entries(SCALES).map(([id, s]) => (
              <option key={id} value={id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* 2. What to look at. */}
      <Choice label="Explore" options={VIEWS} value={view} onChange={setView} className="view-choice" />

      {/* 3. Which one: the chords of the key are the chord picker for every chord view. */}
      <div className="explore-options">
        <DiatonicChords
          keyName={keyName}
          scaleId={scaleType}
          sevenths={sevenths}
          onSeventhsChange={setSevenths}
          silent={view === 'chord' || view === 'inversion'}
          onPick={view === 'scale' ? undefined : pickChord}
          pickHint={view === 'progression' ? 'add it to the progression' : view === 'scale' ? undefined : 'see it on the neck'}
          highlight={view === 'chord' || view === 'inversion' ? (c) => c.degree === picked.degree : undefined}
          title={view === 'progression' ? 'Tap chords to build a progression' : view === 'scale' ? undefined : `Pick a chord in ${keyName}`}
        />

        {view === 'scale' && (
          <div className="option-row">
            <div className="field">
              <span className="field-label" id="position-label">
                Position
              </span>
              <div className="options" role="group" aria-labelledby="position-label">
                {shapes.options.map((o, i) => (
                  <button key={o.label} type="button" className={i === shapes.optionIndex ? 'on' : ''} aria-pressed={i === shapes.optionIndex} onClick={() => setPosition(i === shapes.options.length - 1 ? ALL_POSITIONS : i)}>
                    {o.label.replace('Position ', '')}
                    <small>{o.hint}</small>
                  </button>
                ))}
              </div>
            </div>
            {!shapes.all && <Choice label="Fingering" options={LAYOUT_OPTIONS} value={layout === 'across' ? 'across' : 'position'} onChange={setLayout} />}
          </div>
        )}

        {(view === 'chord' || view === 'inversion') && (
          <div className="option-row">
            <Field label="Chord type" className="type-field">
              <select value={overrideOk ? chordOverride : ''} onChange={(e) => setChordOverride(e.target.value)}>
                <option value="">As in the key ({CHORDS[picked.type].name})</option>
                {typeOptions.map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {view === 'inversion' && isFourNote && <Choice label="Voicing" options={DROP_OPTIONS} value={drop === 'drop3' ? 'drop3' : 'drop2'} onChange={setDrop} />}
            {view === 'inversion' && (
              <div className="field">
                <span className="field-label" id="string-set-label">
                  Strings
                </span>
                <div className="options" role="group" aria-labelledby="string-set-label">
                  {shapes.options.map((o, i) => (
                    <button key={o.label} type="button" className={i === shapes.optionIndex ? 'on' : ''} aria-pressed={i === shapes.optionIndex} onClick={() => setStringSet(i)}>
                      {o.label.replace('Strings ', '')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'progression' && (
          <div className="option-row progression-row">
            <Field label="Progression" className="progression-field">
              <input type="text" value={progression} onChange={(e) => setProgression(e.target.value)} spellCheck="false" autoCapitalize="off" placeholder="I V vi IV" />
            </Field>
            <Field label="Start from" className="preset-field">
              <select
                value=""
                onChange={(e) => {
                  if (!e.target.value) return
                  setProgression(e.target.value)
                }}
              >
                <option value="">Common progressions…</option>
                {PROGRESSIONS.map((p) => (
                  <option key={p.name} value={p.text}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="progression-buttons">
              <button type="button" onClick={() => setProgression(randomProgression(['minor', 'dorian', 'phrygian', 'locrian', 'harmonicMinor', 'melodicMinor'].includes(modeId) ? 'minor' : 'major', 4))}>
                🎲 Random
              </button>
              <button type="button" onClick={() => setProgression('')} disabled={!progression}>
                Clear
              </button>
            </div>
            <Choice label="Neck area" options={AREA_OPTIONS} value={NECK_AREAS[area] ? area : 'open'} onChange={setArea} />
            {badTokens.length > 0 && (
              <p className="progression-error" role="alert">
                Didn’t understand: {badTokens.join(', ')}. Use Roman numerals (I, ii7, bVII) or chord names (Am, F#m7).
              </p>
            )}
          </div>
        )}
      </div>

      {/* 4. The result. */}
      <div className="title-row">
        <h2>
          {heading.title}
          <small>{heading.sub}</small>
        </h2>
        <ul className="chips" aria-label={view === 'progression' ? 'Chords' : 'Notes'}>
          {chips.map((c) => (
            <li key={c.key} className={`chip${c.root ? ' root' : ''}${c.on ? ' on' : ''}`}>
              {c.index !== undefined ? (
                <button type="button" onClick={() => selectColumn(c.index)}>
                  <strong>{c.name}</strong>
                  <span>{c.sub}</span>
                </button>
              ) : (
                <>
                  <strong>{c.name}</strong>
                  <span>{c.sub}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <Fretboard tuning={tuning} intervals={intervals} notes={fretboardNotes} label={noteLabel} stringName={stringName} onNoteClick={(n) => playPitch(tuning[n.string] + n.fret)} />

      <div className="neck-foot">
        <ul className="legend">
          {LEGEND.map(([role, text]) => (
            <li key={role}>
              <span className={`swatch ${role}`} /> {text}
            </li>
          ))}
        </ul>
        {/* Set once and mostly left alone, so it stays folded away. */}
        <details className="neck-settings">
          <summary>
            Neck settings <span className="settings-summary">{settingsSummary}</span>
          </summary>
          <div className="field-grid neck-settings-panel">
            <Field label="Tuning">
              <TuningSelect value={tuningId} onChange={onTuningChange} />
            </Field>
            <Choice label="Note labels" options={LABEL_OPTIONS} value={labels} onChange={setLabels} />
            <Toggle checked={showAll} onChange={setShowAll} disabled={shapes.all}>
              Show every note
            </Toggle>
          </div>
        </details>
      </div>

      <div className="tab-head">
        <h3>
          Tab
          <small>{tabNote}</small>
        </h3>
        <div className="playback">
          <Stepper label="BPM" value={bpm} onChange={onBpmChange} min={30} max={300} step={5} fallback={100} className="bpm-field" />
          <button className="primary" onClick={togglePlay} disabled={!shapes.columns.length}>
            {playing ? '■ Stop' : '▶ Play'}
          </button>
          <PracticeTools bpm={bpm} dronePitch={40 + mod12(keyPc - 4)} droneName={keyName} />
        </div>
      </div>
      {shapes.columns.length ? (
        <Tab columns={columns} tuningNames={tuningNames} columnWidth={shapes.columnWidth} active={activeIndex} onSelect={(i) => selectColumn(i)} />
      ) : (
        <p className="empty">Tap chords above, or pick a common progression, to see it on the neck.</p>
      )}
      <div className="practice-next">
        <p className="hint">Tap a tab column or a note on the neck to hear it · ← / → step through the tab.</p>
        <button type="button" className="drill-button" onClick={drill}>
          Practise it: {drillName} →
        </button>
      </div>
    </section>
  )
}
