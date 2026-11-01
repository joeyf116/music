import { useCallback, useEffect, useRef, useState } from 'react'
import { playChord, playPitch } from '../lib/audio.js'
import { DEFAULT_SETTINGS, NECK_AREAS, PROGRESSIONS, randomProgression } from '../lib/exercises.js'
import {
  ALL_POSITIONS,
  AREA_OPTIONS,
  DROP_OPTIONS,
  LABEL_OPTIONS,
  LAYOUT_OPTIONS,
  LEGEND,
  VIEWS,
  activeColumnIndex,
  columnDuration,
  columnPitches,
  fretboardView,
  headingChips,
  neckNotes,
  noteLabeller,
  progressionMood,
  progressionToken,
  tabStringNames,
} from '../lib/fretboardView.js'
import { CHORDS, SCALES, mod12, pcName, usesFlats } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Choice, Field, Stepper, Toggle } from './controls.jsx'
import DiatonicChords from './DiatonicChords.jsx'
import Fretboard from './Fretboard.jsx'
import KeyPicker from './KeyPicker.jsx'
import Menu from './Menu.jsx'
import PracticeTools from './PracticeTools.jsx'
import Tab from './Tab.jsx'
import TuningSelect from './TuningSelect.jsx'
import { Disclosure, PageHeader } from './layout.jsx'

const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)
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

  const model = fretboardView({ view: storedView, keyName, scaleType, chordDegree, chordOverride, sevenths, drop, layout, position, stringSet, progression, area, tuning, tuningId })
  const { view, picked, overrideOk, isFourNote, badTokens, intervals, shapes, selection, heading, tabNote, drill, typeOptions, keyPc } = model
  const activeIndex = activeColumnIndex(model, active)

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPlaying(false)
  }, [])
  useEffect(() => stop, [selection, stop])

  const playColumn = (col) => {
    const pitches = columnPitches(col, tuning)
    if (pitches.length === 1) playPitch(pitches[0])
    else if (pitches.length) playChord(pitches)
  }

  const selectColumn = (index, play = true) => {
    setActive({ selection, index })
    if (play && shapes.columns[index]) playColumn(shapes.columns[index])
  }

  const togglePlay = () => {
    if (playing) return stop()
    const beat = columnDuration(view, bpm)
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
  const noteLabel = noteLabeller(model, labels, tuning)
  const fretboardNotes = neckNotes(model, activeIndex, showAll, tuning)

  const columns = shapes.columns.map((c) => (view === 'scale' ? { ...c, label: noteLabel(c.notes[0]) } : c))
  // Open strings follow the tuning's own spelling (Eb standard reads Eb, not D#), otherwise the key's.
  const stringName = (s) => pcName(tuning[s], tuningSpec.flats ?? usesFlats(keyName))
  const tuningNames = tabStringNames(tuning, stringName)

  const chips = headingChips(model, activeIndex)

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

  const practise = () => openExercise(drill.settings)

  const settingsSummary = [tuningSpec.name, labels === 'notes' ? 'note names' : 'intervals', showAll ? 'all notes' : 'shape only'].join(' · ')

  // In the chord views the chords of the key are the picker, so they sit above the neck; for scales they are
  // reference, so they go to the end of the page.
  const chordStrip = (
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
  )

  return (
    <section className="page fretboard-page">
      <PageHeader title="Fretboard" summary="See any scale, chord or inversion on the neck, hear it, then practise it." />
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
        {view !== 'scale' && chordStrip}

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
            <div className="progression-buttons">
              <Menu
                  label="Common progressions"
                    items={PROGRESSIONS.map((p) => ({ label: p.name, detail: p.text, onSelect: () => setProgression(p.text) }))}
                >
                  Common ▾
                </Menu>
              <button type="button" onClick={() => setProgression(randomProgression(progressionMood(scaleType), 4))}>
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

      {/* 4. The result: the neck, then its tab. */}
      <div className="stage">
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
          <Disclosure label="Neck settings" summary={settingsSummary} className="neck-settings">
            <div className="field-grid neck-settings-panel">
              <Field label="Tuning">
                <TuningSelect value={tuningId} onChange={onTuningChange} />
              </Field>
              <Choice label="Note labels" options={LABEL_OPTIONS} value={labels} onChange={setLabels} />
              <Toggle checked={showAll} onChange={setShowAll} disabled={shapes.all}>
                Show every note
              </Toggle>
            </div>
          </Disclosure>
        </div>
      </div>

      <div className="stage">
        <div className="tab-head">
          <h2>
            Tab
            <small>{tabNote}</small>
          </h2>
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
          <button type="button" className="drill-button" onClick={practise}>
            Practise it: {drill.name} →
          </button>
        </div>
      </div>

      {view === 'scale' && chordStrip}
    </section>
  )
}
