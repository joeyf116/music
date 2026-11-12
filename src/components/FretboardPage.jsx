import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playChord, playPitch } from '../lib/audio.js'
import { ALL_POSITIONS, LABEL_OPTIONS, LAYOUT_OPTIONS, LEGEND, VIEWS, activeColumnIndex, columnDuration, columnPitches, fretboardView, legacyView, neckNotes, noteLabeller, progressionMood, tabStringNames } from '../lib/fretboardView.js'
import { CHORD_STYLES, addItem, createItem, practiceColumns, progressionItems, validItems } from '../lib/practiceTab.js'
import { CHORDS, SCALES, pcName, usesFlats } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import { currentGroove } from '../lib/practiceBacking.js'
import { usePlayer } from '../lib/usePlayer.jsx'
import { Choice, Field, Toggle } from './controls.jsx'
import DiatonicChords from './DiatonicChords.jsx'
import Fretboard, { zoomWindow } from './Fretboard.jsx'
import KeyPicker from './KeyPicker.jsx'
import PracticeTab from './PracticeTab.jsx'
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
 * The Fretboard page: pick a key, look at its scale or one voicing of a chord in it at a time, and pin what you want
 * to practise into the practice tab, which plays everything pinned as one looping tab.
 */
export default function FretboardPage({ keyName, onKeyChange, scaleType, onScaleChange, tuning, tuningSpec, tuningId, onTuningChange }) {
  // The practice tab and its playback live in the app-wide player, so they keep going on other pages.
  const player = usePlayer()
  const { items, setItems, chordStyle, setChordStyle, bpm, setBpm: onBpmChange, practicePlaying: playing, practiceActive, setPracticeActive } = player
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
    if (old.progression && !items.length) setItems(progressionItems(readStored('music.fretProgression', '') || 'I V vi IV', keyName, tuning, tuningId).items)
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

  const practice = useMemo(() => practiceColumns(items), [items])

  const togglePractice = () => {
    if (playing) return player.stopPractice()
    stopListening()
    player.startPractice()
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

  // ---- Pinning ----
  const [justPinned, setJustPinned] = useState(false)
  const [cleared, setCleared] = useState(null)
  useEffect(() => {
    if (!justPinned) return undefined
    const t = setTimeout(() => setJustPinned(false), 1500)
    return () => clearTimeout(t)
  }, [justPinned])
  const pinIt = () => {
    if (!pin) return
    setItems((list) => addItem(validItems(list), createItem(pin)))
    setCleared(null)
    setJustPinned(true)
  }
  const changeItems = (next) => {
    // Clearing a tab of more than one item can be undone.
    setCleared(!next.length && items.length > 1 ? items : null)
    setItems(next)
  }
  const startFrom = (text) => {
    const { items: added } = progressionItems(text, keyName, tuning, tuningId)
    setItems((list) => [...validItems(list), ...added])
    setCleared(null)
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
  const settingsSummary = [tuningSpec.name, labels === 'notes' ? 'note names' : 'intervals', showAllApplies ? (showAll ? 'all notes' : 'shape only') : null, CHORD_STYLES.find((c) => c.value === chordStyle)?.label.toLowerCase() ?? 'strum']
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
      <PageHeader title="Fretboard" summary="Find a voicing in any key and pin it to practise." />

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
          <button type="button" className={`pin-button${justPinned ? ' done' : ''}`} onClick={pinIt} disabled={!pin}>
            {justPinned ? '✓ Pinned' : '＋ Pin to practice tab'}
          </button>
          <button type="button" onClick={toggleListen} disabled={!columns.length}>
            {listening ? '■ Stop' : '▶ Listen'}
          </button>
        </div>

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
            <Choice label="Practice tab chords" options={CHORD_STYLES} value={chordStyle} onChange={setChordStyle} />
          </div>
        </Disclosure>
      </div>

      {view !== 'chord' && <div className="chord-reference">{chordStrip}</div>}

      {/* 4. Everything pinned, as one looping tab. */}
      <PracticeTab
        items={items}
        onItemsChange={changeItems}
        onStartFrom={startFrom}
        mood={progressionMood(scaleType)}
        playing={playing}
        onTogglePlay={togglePractice}
        active={practiceActive}
        onSelectColumn={(i) => {
          setPracticeActive(i)
          if (practice.columns[i]) playColumn(practice.columns[i])
        }}
        bpm={bpm}
        onBpmChange={onBpmChange}
        backing={player.backing}
        onBackingChange={player.setBacking}
        grooveName={player.backing === 'groove' ? currentGroove(bpm).name : ''}
        drone={player.drone}
        onDroneChange={player.setDrone}
        droneName={keyName}
        tuningId={tuningId}
        tuningNames={tuningNames}
        cleared={Boolean(cleared)}
        onUndoClear={() => {
          setItems(cleared)
          setCleared(null)
        }}
      />

    </section>
  )
}
