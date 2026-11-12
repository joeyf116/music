import { useCallback, useEffect, useRef, useState } from 'react'
import { playChord, playPitch } from '../lib/audio.js'
import { ALL_POSITIONS, LABEL_OPTIONS, LAYOUT_OPTIONS, LEGEND, VIEWS, activeColumnIndex, columnDuration, columnPitches, fretboardView, legacyView, neckNotes, noteLabeller, tabStringNames } from '../lib/fretboardView.js'
import { createStep, resolveKind, stepsFromText, voicingList } from '../lib/progression.js'
import { CHORDS, SCALES, pcName, usesFlats } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import { usePlayer } from '../lib/usePlayer.jsx'
import { Choice, Field, Toggle } from './controls.jsx'
import DiatonicChords from './DiatonicChords.jsx'
import Fretboard, { zoomWindow } from './Fretboard.jsx'
import KeyPicker from './KeyPicker.jsx'
import Tab from './Tab.jsx'
import TuningSelect from './TuningSelect.jsx'
import { Disclosure, PageHeader } from './layout.jsx'

// True on phone-width screens (under 720 px), following rotation and resizing.
function useNarrow() {
  const query = '(max-width: 719px)'
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches))
  useEffect(() => {
    const list = window.matchMedia?.(query)
    if (!list) return undefined
    const onChange = () => setNarrow(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [])
  return narrow
}

const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)
const readStored = (key, fallback) => {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

/**
 * The Fretboard page: pick a key, look at its scale or one voicing of a chord in it at a time. A voicing can be added
 * to the progression on the Practice page; a scale position opens there, played through that progression.
 */
export default function FretboardPage({ keyName, onKeyChange, scaleType, onScaleChange, tuning, tuningSpec, tuningId, onTuningChange }) {
  // The progression lives in the app-wide player, shared with the Practice page.
  const player = usePlayer()
  const { steps, setSteps, bpm } = player
  const [storedView, setView] = usePersistentState('music.mode', 'scale')
  const [chordDegree, setChordDegree] = usePersistentState('music.chordDegree', 0)
  const [chordOverride, setChordOverride] = usePersistentState('music.chordType', '')
  const [sevenths, setSevenths] = usePersistentState('music.diatonicSevenths', false)
  const [voicingType, setVoicingType] = usePersistentState('music.voicingType', 'shapes')
  const [voicingIndex, setVoicingIndex] = usePersistentState('music.voicingIndex', 0)
  const [labels, setLabels] = usePersistentState('music.labels', 'notes')
  const [showAll, setShowAll] = usePersistentState('music.showAll', true)
  // Phones zoom the neck in on the shape so it fits without swiping; "Whole neck" turns that off.
  const [zoomPref, setZoomPref] = usePersistentState('music.neckZoom', true)
  const narrow = useNarrow()
  const [layout, setLayout] = usePersistentState('music.scaleLayout', 'position')
  const [position, setPosition] = usePersistentState('music.fretPosition', 0)

  const model = fretboardView({ view: storedView, keyName, scaleType, chordDegree, chordOverride, sevenths, voicingType, voicingIndex, layout, position, tuning, tuningId })
  const { view, picked, overrideOk, shapes, selection, heading, tabNote, typeOptions, voicings, voicingTypes, pin } = model

  // Views saved before Inversions, CAGED and Progressions moved into Chords open where they now live.
  useEffect(() => {
    const old = legacyView(storedView, readStored('music.dropVoicing', 'drop2'))
    if (!old) return
    setView(old.view)
    setVoicingType(old.voicingType)
    setVoicingIndex(0)
    if (old.progression && !steps.length) setSteps(stepsFromText(readStored('music.fretProgression', '') || 'I V vi IV', { keyName, tuning }).steps)
    // Only the stored view matters here: this runs once, when an old one is found.
  }, [storedView]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- The neck's own tab: tap a column to hear it, Listen plays it through once ----
  const [active, setActive] = useState(null)
  const [listening, setListening] = useState(false)
  const timers = useRef([])
  const activeIndex = activeColumnIndex(model, active)
  const stopListening = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setListening(false)
  }, [])
  useEffect(() => stopListening, [selection, stopListening])
  const playColumn = (col) => {
    const pitches = columnPitches(col, tuning).filter((p) => !Number.isNaN(p))
    if (pitches.length === 1) playPitch(pitches[0])
    else if (pitches.length) playChord(pitches)
  }
  const selectColumn = (index, play = true) => {
    setActive({ selection, index })
    if (play && shapes.columns[index]) playColumn(shapes.columns[index])
  }

  const toggleListen = () => {
    if (listening) return stopListening()
    player.stopAll()
    setListening(true)
    let at = 0
    timers.current = shapes.columns.map((col, i) => {
      const t = setTimeout(() => {
        setActive({ selection, index: i })
        playColumn(col)
      }, at)
      at += columnDuration(col, bpm)
      return t
    })
    timers.current.push(setTimeout(() => setListening(false), at))
  }

  // ---- Adding to the progression on the Practice page ----
  const [added, setAdded] = useState(null)
  useEffect(() => {
    if (!added) return undefined
    const t = setTimeout(() => setAdded(null), 4000)
    return () => clearTimeout(t)
  }, [added])
  const addToProgression = () => {
    if (!pin || view !== 'chord') return
    const type = model.chordType
    const notes = pin.columns[0].notes
    // Keep the voicing as one of the Practice page's own when it is one (so ‹ › still step from it), else as its frets.
    const kind = resolveKind(model.voicingType, type)
    const list = voicingList(picked.rootPc, type, kind, tuning)
    const same = (a) => a.length === notes.length && a.every((n) => notes.some((m) => m.string === n.string && m.fret === n.fret))
    const index = list.findIndex((v) => same(v.notes))
    const step = createStep({ rootPc: picked.rootPc, type }, { keyName, tuning, kind })
    const next = index >= 0 ? { ...step, kind, index } : { ...step, frets: notes, fretsKey: keyName }
    setSteps([...steps, next])
    setAdded(steps.length + 1)
  }
  const practiseScale = () => {
    player.setMode('scales')
    if (!shapes.all) player.setPosition(shapes.optionIndex)
    window.location.assign('#practice')
  }

  // ---- Choosing what the neck shows ----
  // Stepping to a voicing or picking a chord plays it as the neck then shows it.
  const pendingPlay = useRef(false)
  useEffect(() => {
    if (!pendingPlay.current) return
    pendingPlay.current = false
    if (shapes.columns[0]) playColumn(shapes.columns[0])
  })
  const stepVoicing = (delta) => {
    if (!voicings.length) return
    pendingPlay.current = true
    setVoicingIndex((model.voicingIndex + delta + voicings.length) % voicings.length)
  }
  const pickChord = (chord) => {
    pendingPlay.current = true
    if (view !== 'chord') setView('chord')
    if (chord.degree !== picked.degree || overrideOk) setVoicingIndex(0)
    setChordDegree(chord.degree)
    setChordOverride('')
  }
  const pickType = (type) => {
    pendingPlay.current = true
    setVoicingType(type)
    setVoicingIndex(0)
  }

  // Arrow keys: the next voicing in Chords view, the next note of the run in Scale view.
  const stepRef = useRef(null)
  useEffect(() => {
    stepRef.current = (delta) => {
      if (view === 'chord') return stepVoicing(delta)
      if (!shapes.columns.length) return
      const current = activeIndex ?? -1
      selectColumn((current + delta + shapes.columns.length) % shapes.columns.length)
    }
  })
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(document.activeElement) || e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowRight') stepRef.current?.(1)
      if (e.key === 'ArrowLeft') stepRef.current?.(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---- What the neck shows ----
  const noteLabel = noteLabeller(model, labels, tuning)
  const fretboardNotes = neckNotes(model, activeIndex, showAll, tuning)
  const canZoom = Boolean(zoomWindow(fretboardNotes.filter((n) => n.level === 'shape' || n.level === 'active').map((n) => n.fret)))
  const zoomed = narrow && zoomPref && canZoom
  // Single notes in a run are labelled with their note (or interval) under the tab.
  const columns = shapes.columns.map((c) => (c.notes.length === 1 ? { ...c, label: noteLabel(c.notes[0]) } : c))
  // Open strings follow the tuning's own spelling (Eb standard reads Eb, not D#), otherwise the key's.
  const stringName = (s) => pcName(tuning[s], tuningSpec.flats ?? usesFlats(keyName))
  const tuningNames = tabStringNames(tuning, stringName)
  const voicing = voicings[model.voicingIndex]
  const showAllApplies = !shapes.all && !shapes.caged
  const settingsSummary = [tuningSpec.name, labels === 'notes' ? 'note names' : 'intervals', showAllApplies ? (showAll ? 'all notes' : 'shape only') : null]
    .filter(Boolean)
    .join(' · ')

  // The key's chords: the chord picker on top in Chords view, reference under the neck in Scale view.
  const chordStrip = (
    <DiatonicChords
      keyName={keyName}
      scaleId={scaleType}
      sevenths={sevenths}
      onSeventhsChange={setSevenths}
      silent
      onPick={pickChord}
      highlight={view === 'chord' ? (c) => c.degree === picked.degree : undefined}
      title={`Chords in ${keyName}`}
    />
  )

  return (
    <section className="page fretboard-page">
      <PageHeader title="Fretboard" summary="Find any scale position or chord voicing in any key." />

      {/* 1. Where you are: the key, its chords, the scale and what to look at. */}
      <div className="explore-setup">
        <KeyPicker value={keyName} onChange={onKeyChange} />
        {view === 'chord' && chordStrip}
        <div className="explore-row">
          <Field label="Scale / mode" className="scale-field">
            <select value={scaleType} onChange={(e) => onScaleChange(e.target.value)}>
              {Object.entries(SCALES).map(([id, s]) => (
                <option key={id} value={id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Choice label="Show" options={VIEWS} value={view} onChange={setView} className="view-choice" />
        </div>
      </div>

      {/* 2. Which one: a scale position, or a voicing type for the chord. */}
      {view === 'scale' ? (
        <div className="field position-field">
          <span className="field-label" id="position-label">
            Position
          </span>
          <div className="options position-options" role="group" aria-labelledby="position-label">
            {shapes.options.map((o, i) => (
              <button key={o.label} type="button" className={i === shapes.optionIndex ? 'on' : ''} aria-pressed={i === shapes.optionIndex} onClick={() => setPosition(i === shapes.options.length - 1 ? ALL_POSITIONS : i)}>
                {o.label.replace('Position ', '')}
                <small>{o.hint}</small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Choice label="Voicing" options={voicingTypes} value={model.voicingType} onChange={pickType} className="voicing-choice" />
      )}

      {/* 3. The neck, the one voicing or position on it, and Pin. */}
      <div className="stage">
        <div className="title-row">
          <h2>
            {heading.title}
            <small>{heading.sub}</small>
          </h2>
          {narrow && canZoom && (
            <button type="button" className="neck-zoom-button" onClick={() => setZoomPref(!zoomPref)} aria-pressed={!zoomPref}>
              {zoomPref ? 'Whole neck' : 'Zoom in'}
            </button>
          )}
        </div>
        <Fretboard zoom={zoomed} tuning={tuning} intervals={model.intervals} notes={fretboardNotes} label={noteLabel} stringName={stringName} onNoteClick={(n) => playPitch(tuning[n.string] + n.fret)} />
        <ul className="legend">
          {LEGEND.map(([role, text]) => (
            <li key={role}>
              <span className={`swatch ${role}`} /> {text}
            </li>
          ))}
        </ul>

        {view === 'chord' && (
          <div className="voicing-stepper">
            <button type="button" onClick={() => stepVoicing(-1)} disabled={voicings.length < 2} aria-label="Previous voicing">
              ‹
            </button>
            <p aria-live="polite">
              <strong>{voicing ? voicing.label : 'No voicings in this tuning'}</strong>
              {voicing && (
                <span>
                  {voicing.hint} · {model.voicingIndex + 1} of {voicings.length}
                </span>
              )}
            </p>
            <button type="button" onClick={() => stepVoicing(1)} disabled={voicings.length < 2} aria-label="Next voicing">
              ›
            </button>
          </div>
        )}

        {columns.length > 0 && (
          <div className="stage-tab">
            {tabNote && <p className="tab-note">{tabNote}</p>}
            <Tab columns={columns} tuningNames={tuningNames} columnWidth={shapes.columnWidth} active={activeIndex} onSelect={(i) => selectColumn(i)} />
          </div>
        )}
        <div className="pin-row">
          {view === 'chord' ? (
            <button type="button" className={`pin-button${added ? ' done' : ''}`} onClick={addToProgression} disabled={!pin}>
              {added ? '✓ Added' : '＋ Add to progression'}
            </button>
          ) : (
            <button type="button" className="pin-button" onClick={practiseScale}>
              Practise over a progression
            </button>
          )}
          <button type="button" onClick={toggleListen} disabled={!columns.length}>
            {listening ? '■ Stop' : '▶ Listen'}
          </button>
        </div>

        {added && (
          <p className="pin-status" role="status">
            {model.chordName} is chord {added} of your progression. <a href="#practice">Open Practice</a>
          </p>
        )}

        <Disclosure label="Settings" summary={settingsSummary} storageKey="music.fretSettingsOpen" className="neck-settings">
          <div className="field-grid neck-settings-panel">
            <Field label="Tuning">
              <TuningSelect value={tuningId} onChange={onTuningChange} />
            </Field>
            <Choice label="Note labels" options={LABEL_OPTIONS} value={labels} onChange={setLabels} />
            <Toggle checked={showAll} onChange={setShowAll} disabled={!showAllApplies}>
              Show every note
            </Toggle>
            {view === 'scale' ? (
              <Choice label="Fingering" options={LAYOUT_OPTIONS} value={layout === 'across' ? 'across' : 'position'} onChange={setLayout} />
            ) : (
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
            )}
          </div>
        </Disclosure>
      </div>

      {view !== 'chord' && <div className="chord-reference">{chordStrip}</div>}


    </section>
  )
}
