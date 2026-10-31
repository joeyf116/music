import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CHORD_LENGTHS,
  CHROMATIC_PATTERNS,
  DEFAULT_SETTINGS,
  EXERCISES,
  LAYOUTS,
  METERS,
  NECK_AREAS,
  PICKING,
  PROGRESSIONS,
  RATES,
  SEQUENCES,
  STRUMS,
  buildExercise,
  randomProgression,
  rateFits,
} from '../lib/exercises.js'
import { playEvent, startPlayback } from '../lib/player.js'
import { CHORDS, KEYS, SCALES, noteToPc, pcName, scalePosition, sevenNoteScale, spellNotes, stringSets, usesFlats } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Choice, Field, Stepper, Toggle } from './controls.jsx'
import DiatonicChords from './DiatonicChords.jsx'
import Fretboard from './Fretboard.jsx'
import Tab from './Tab.jsx'
import TuningSelect from './TuningSelect.jsx'

const GROUPS = [...new Set(EXERCISES.map((e) => e.group))]
const SEVEN_NOTE_SCALES = Object.entries(SCALES).filter(([, s]) => s.intervals.length === 7)
const INVERSIONS = ['Root', '1st', '2nd']
const ARP_DIRECTIONS = [
  { value: 'up', label: 'Up' },
  { value: 'updown', label: 'Up & down' },
  { value: 'alternate', label: 'Alternate', title: 'Alternate up / down' },
]
const SPEED_UPS = [0, 2, 5, 10]
const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
// Tab column width by the shortest note in the exercise, so 16ths pack tighter than quarters.
const COLUMN_WIDTHS = { 2: 20, 3: 22, 4: 24, 6: 26, 12: 34 }
const clampBpm = (bpm) => Math.max(30, Math.min(300, Number(bpm) || 80))
const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)
// A chord from the key's strip as the progression box writes it (♭VII → bVII; the parser has no +maj7, so III+ stands in).
const progressionToken = (chord) => chord.numeral.replace('♭', 'b').replace('♯', '#').replace('+maj7', '+')
const fretHint = (notes) => {
  const frets = notes.map((n) => n.fret)
  return `fr ${Math.min(...frets)}–${Math.max(...frets)}`
}

/** Generated practice exercises (scales, arpeggios, progressions, fingerstyle) with tab that plays along in time. */
export default function Exercises({ tuning, tuningId, onTuningChange, stringName, keyName, onKeyChange, scaleType, onScaleChange }) {
  const [stored, setStored] = usePersistentState('music.exercises', DEFAULT_SETTINGS)
  const [bpm, setBpm] = usePersistentState('music.exerciseBpm', 80)
  const [loop, setLoop] = usePersistentState('music.exerciseLoop', true)
  const [countIn, setCountIn] = usePersistentState('music.exerciseCountIn', true)
  const [click, setClick] = usePersistentState('music.exerciseClick', true)
  const [speedUp, setSpeedUp] = usePersistentState('music.exerciseSpeedUp', 0)
  const [labels, setLabels] = usePersistentState('music.exerciseLabels', 'notes')
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(null)
  const [countBeat, setCountBeat] = useState(null)
  const [liveBpm, setLiveBpm] = useState(null)
  const [showOptions, setShowOptions] = useState(false)

  // Key and scale are shared with the Fretboard page, so the mode (minor, Dorian…) carries over between pages,
  // exercises and keys. Exercises that need a seven-note scale use the parent of a pentatonic or blues scale.
  const score = useMemo(() => buildExercise({ ...stored, key: keyName, scale: scaleType, scale7: sevenNoteScale(scaleType) }, tuning), [stored, keyName, scaleType, tuning])
  const s = score.settings
  const set = ({ key: newKey, scale, scale7, ...rest }) => {
    if (newKey) onKeyChange(newKey)
    if (scale ?? scale7) onScaleChange(scale ?? scale7)
    if (Object.keys(rest).length) setStored({ ...stored, ...rest })
  }
  const key = s.key
  const flats = usesFlats(key)
  const { exercise, meter, events } = score
  const has = (control) => exercise.controls.includes(control)
  const tempo = clampBpm(bpm)

  // Restart in time whenever the exercise or tempo changes mid-play; only the first start counts in.
  const started = useRef(false)
  useEffect(() => {
    if (!playing) {
      started.current = false
      return
    }
    const stop = startPlayback(score, {
      bpm: tempo,
      loop,
      countIn: countIn && !started.current,
      click,
      speedUp: loop ? speedUp : 0,
      onStep: (index, count) => {
        setCountBeat(count ?? null)
        if (index >= 0) setActive(index)
      },
      onBpm: setLiveBpm,
      onEnd: () => setPlaying(false),
    })
    started.current = true
    return () => {
      stop()
      setCountBeat(null)
      setLiveBpm(null)
    }
  }, [playing, score, tempo, loop, countIn, click, speedUp])

  const togglePlay = () => {
    if (!playing) {
      setActive(null)
      // Playing is for watching the tab, so the options fold away and leave it the screen.
      setShowOptions(false)
    }
    setPlaying(!playing)
  }

  const selectColumn = (index) => {
    setActive(index)
    if (!playing && events[index]?.notes.length) playEvent(events[index])
  }

  // Space starts/stops, ← / → step through the tab while stopped.
  const keyRef = useRef(null)
  useEffect(() => {
    keyRef.current = (e) => {
      if (isTyping(document.activeElement)) return
      if (e.key === ' ' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault()
        togglePlay()
      } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !playing && events.length) {
        const index = ((active ?? -1) + (e.key === 'ArrowRight' ? 1 : -1) + events.length) % events.length
        selectColumn(index)
      }
    }
  })
  useEffect(() => {
    const onKey = (e) => keyRef.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const activeIndex = active !== null && active < events.length ? active : null
  const current = activeIndex === null ? null : events[activeIndex]

  const noteName = (n) => n.name ?? pcName(n.pitch, flats)
  const melodic = !has('progression')
  const columns = events.map((e) => ({
    notes: e.notes,
    heading: e.heading,
    label: e.label ?? (melodic && e.notes.length === 1 ? (labels === 'notes' ? noteName(e.notes[0]) : e.notes[0].degree) : ''),
    sublabel: e.count,
    groupStart: e.barStart,
  }))
  const shortest = Math.min(...events.slice(1).map((e, i) => e.tick - events[i].tick), 12)
  const columnWidth = COLUMN_WIDTHS[shortest] ?? 26

  // Fretboard: the whole exercise (or the current chord) with the playing note highlighted.
  const fretboardNotes = (() => {
    const map = new Map()
    const add = (n, level) => map.set(`${n.string}-${n.fret}`, { ...n, level })
    const shapeSource = melodic ? events.flatMap((e) => e.notes) : (current ?? events[0])?.shape ?? []
    shapeSource.forEach((n) => add(n, 'shape'))
    current?.notes.forEach((n) => add(n, 'active'))
    return [...map.values()].sort((a, b) => (a.level === 'active') - (b.level === 'active'))
  })()
  const fretLabel = (n) => (labels === 'notes' || !melodic ? noteName(n) : n.degree)

  const scale = SCALES[has('scale7') ? s.scale7 : s.scale] ?? SCALES.major
  const positions = (() => {
    if (!has('position')) return []
    const rootPc = noteToPc(key)
    const intervals = exercise.id === 'chordArpeggio' ? (CHORDS[s.chord] ?? CHORDS.maj7).intervals : scale.intervals
    // Each button shows its box's frets, so a position means the same place whichever fingering is chosen.
    return intervals.map((_, i) => fretHint(scalePosition(rootPc, intervals, tuning, i)))
  })()
  const sets = stringSets(3, tuning.length)
  const stringLabel = (i) => `${ORDINALS[tuning.length - i]} (${stringName(i)})`

  const title = (() => {
    if (exercise.id === 'progression' || exercise.id === 'fingerstyle') return `${exercise.name} in ${key}`
    if (exercise.id === 'chromatic') return `${exercise.name}: ${s.fingers}`
    if (exercise.id === 'chordArpeggio') return `${key}${(CHORDS[s.chord] ?? CHORDS.maj7).symbol} arpeggio`
    return `${spellNotes(key, scale.intervals, true).root} ${scale.name}: ${exercise.name.toLowerCase()}`
  })()

  return (
    <section className="panel exercises">
      <div className="section-head">
        <h2>Exercises</h2>
        <Field label="Tuning" className="head-field">
          <TuningSelect value={tuningId} onChange={onTuningChange} />
        </Field>
      </div>

      {/* One grouped menu at every width: the exercise, then just the settings that exercise uses. */}
      <label className="field exercise-field">
        <span className="field-label">Exercise</span>
        <select value={exercise.id} onChange={(e) => set({ exercise: e.target.value })}>
          {GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {EXERCISES.filter((e) => e.group === group).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <details className="exercise-about">
        <summary>Why practise this?</summary>
        <p>{exercise.about}</p>
        <p>Start slow enough to play it perfectly, then let “Speed up” push the tempo a little each time round.</p>
      </details>

      {has('key') && (
        <div className="field">
          <span className="field-label" id="exercise-key-label">
            Key
          </span>
          <div className="keys" role="group" aria-labelledby="exercise-key-label">
            {KEYS.map((k) => (
              <button key={k} className={k === key ? 'on' : ''} onClick={() => set({ key: k })} aria-pressed={k === key}>
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {has('progression') && (
        <div className="field">
          <span className="field-label" id="exercise-progression-label">
            Progression
          </span>
          <div className="progression-editor">
            <input
              type="text"
              value={s.progression}
              onChange={(e) => set({ progression: e.target.value })}
              spellCheck="false"
              autoCapitalize="off"
              aria-labelledby="exercise-progression-label"
              placeholder="I V vi IV"
            />
            <div className="progression-actions">
              <select value="" onChange={(e) => e.target.value && set({ progression: e.target.value })} aria-label="Common progressions">
                <option value="">Common progressions…</option>
                {PROGRESSIONS.map((p) => (
                  <option key={p.name} value={p.text}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => set({ progression: randomProgression('major', 4), scale: 'major' })}>
                🎲 Major
              </button>
              <button type="button" onClick={() => set({ progression: randomProgression('minor', 4), scale: 'minor' })}>
                🎲 Minor
              </button>
            </div>
            <DiatonicChords keyName={key} scaleId={s.scale} onScaleChange={(id) => set({ scale: id })} onPick={(c) => set({ progression: `${s.progression.trim()} ${progressionToken(c)}`.trim() })} pickHint="add it to the progression" />
            {score.errors.length > 0 && (
              <p className="progression-error" role="alert">
                Didn’t understand: {score.errors.join(', ')}. Use Roman numerals (I, ii7, bVII) or chord names (Am, F#m7).
              </p>
            )}
          </div>
        </div>
      )}

      {/* Every setting is the same shape, so the row reflows cleanly from phone to desktop. */}
      <div className="field-grid exercise-fields">
        {has('scale') && (
          <label className="field">
            <span className="field-label">Scale</span>
            <select value={s.scale} onChange={(e) => set({ scale: e.target.value, position: 0 })}>
              {Object.entries(SCALES).map(([id, sc]) => (
                <option key={id} value={id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('scale7') && (
          <label className="field">
            <span className="field-label">Scale</span>
            <select value={s.scale7} onChange={(e) => set({ scale7: e.target.value })}>
              {SEVEN_NOTE_SCALES.map(([id, sc]) => (
                <option key={id} value={id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('chord') && (
          <label className="field">
            <span className="field-label">Chord</span>
            <select value={s.chord} onChange={(e) => set({ chord: e.target.value, position: 0 })}>
              {Object.entries(CHORDS).map(([id, c]) => (
                <option key={id} value={id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('sequence') && (
          <label className="field">
            <span className="field-label">Pattern</span>
            <select value={s.sequence} onChange={(e) => set({ sequence: e.target.value })}>
              {Object.entries(SEQUENCES).map(([id, q]) => (
                <option key={id} value={id}>
                  {q.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('string') && (
          <label className="field">
            <span className="field-label">String</span>
            <select value={Math.min(s.string, tuning.length - 1)} onChange={(e) => set({ string: Number(e.target.value) })}>
              {tuning.map((_, i) => (
                <option key={i} value={i}>
                  {stringLabel(i)}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('fingers') && (
          <label className="field">
            <span className="field-label">Finger order</span>
            <select value={s.fingers} onChange={(e) => set({ fingers: e.target.value })}>
              {CHROMATIC_PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {[...p].join('-')}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('startFret') && (
          <Stepper label="Start fret" value={s.startFret} onChange={(v) => set({ startFret: v })} min={1} max={19} fallback={5} />
        )}
        {has('arpSize') && (
          <Choice
            label="Chords"
            options={[
              { value: 'triads', label: 'Triads' },
              { value: 'sevenths', label: '7th chords' },
            ]}
            value={s.arpSize}
            onChange={(v) => set({ arpSize: v })}
          />
        )}
        {has('arpDirection') && (
          <Choice label="Direction" options={ARP_DIRECTIONS} value={s.arpDirection} onChange={(v) => set({ arpDirection: v })} />
        )}
        {has('stringSet') && (
          <label className="field">
            <span className="field-label">Strings</span>
            <select value={Math.min(s.stringSet, sets.length - 1)} onChange={(e) => set({ stringSet: Number(e.target.value) })}>
              {sets.map((strings, i) => (
                <option key={i} value={i}>
                  {strings.map((st) => stringName(st)).join(' ')} ({strings.map((st) => tuning.length - st).reverse().join('-')})
                </option>
              ))}
            </select>
          </label>
        )}
        {has('inversion') && (
          <Choice label="Inversion" options={INVERSIONS.map((text, i) => ({ value: i, label: text }))} value={Number(s.inversion)} onChange={(v) => set({ inversion: v })} />
        )}
        {has('triadStyle') && (
          <Choice
            label="Played as"
            options={[
              { value: 'arpeggio', label: 'Arpeggiated' },
              { value: 'block', label: 'Block chords' },
            ]}
            value={s.triadStyle}
            onChange={(v) => set({ triadStyle: v })}
          />
        )}
        {has('sevenths') && (
          <Choice
            label="Chord type"
            options={[
              { value: false, label: 'As written' },
              { value: true, label: '7th chords' },
            ]}
            value={Boolean(s.sevenths)}
            onChange={(v) => set({ sevenths: v })}
          />
        )}
        {has('chordLength') && (
          <label className="field">
            <span className="field-label">Each chord</span>
            <select value={s.chordLength} onChange={(e) => set({ chordLength: Number(e.target.value) })}>
              {Object.entries(CHORD_LENGTHS).map(([id, c]) => (
                <option key={id} value={id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('neck') && (
          <label className="field">
            <span className="field-label">Voicings</span>
            <select value={s.neck} onChange={(e) => set({ neck: e.target.value })}>
              {Object.entries(NECK_AREAS).map(([id, a]) => (
                <option key={id} value={id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('strum') && (
          <label className="field">
            <span className="field-label">Strum</span>
            <select value={s.strum} onChange={(e) => set({ strum: e.target.value })}>
              {Object.entries(STRUMS).map(([id, p]) => (
                <option key={id} value={id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('picking') && (
          <label className="field">
            <span className="field-label">Picking</span>
            <select value={s.picking} onChange={(e) => set({ picking: e.target.value })}>
              {Object.entries(PICKING).map(([id, p]) => (
                <option key={id} value={id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('rate') && (
          <label className="field">
            <span className="field-label">Note value</span>
            <select value={s.rate} onChange={(e) => set({ rate: e.target.value })}>
              {Object.entries(RATES).map(([id, r]) => (
                <option key={id} value={id} disabled={!rateFits(id, meter)}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span className="field-label">Time signature</span>
          <select value={meter.id} onChange={(e) => set({ meter: e.target.value })}>
            {Object.keys(METERS).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      </div>

      {has('layout') && (
        <Choice
          label="Fingering"
          options={Object.entries(LAYOUTS).map(([value, l]) => ({ value, label: l.name, title: l.title }))}
          value={LAYOUTS[s.layout] ? s.layout : 'position'}
          onChange={(v) => set({ layout: v })}
        />
      )}

      {positions.length > 0 && (
        <div className="field">
          <span className="field-label" id="exercise-position-label">
            {s.layout === 'across' ? 'Starts in position' : 'Position'}
          </span>
          <div className="options" role="group" aria-labelledby="exercise-position-label">
            {positions.map((hint, i) => (
              <button key={i} className={Math.min(s.position, positions.length - 1) === i ? 'on' : ''} onClick={() => set({ position: i })}>
                {i + 1}
                <small>{hint}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tab-head">
        <h3>
          {title}
          <small>
            {meter.id} · {score.bars} {score.bars === 1 ? 'bar' : 'bars'}
          </small>
        </h3>
        {melodic && (
          <Choice
            label="Note labels"
            hideLabel
            size="small"
            options={[
              { value: 'notes', label: 'Notes' },
              { value: 'degrees', label: exercise.id === 'chromatic' ? 'Fingers' : 'Intervals' },
            ]}
            value={labels === 'notes' ? 'notes' : 'degrees'}
            onChange={setLabels}
          />
        )}
      </div>

      {/* While playing, phones keep this bar in reach above the tab bar; the extras fold away until wanted. */}
      <div className={`transport${playing ? ' playing' : ''}`}>
        <button type="button" className="primary play-button" onClick={togglePlay} disabled={!events.length} aria-pressed={playing}>
          {playing ? '■ Stop' : '▶ Play'}
        </button>
        <Stepper label={meter.unit === 8 ? 'BPM (8ths)' : 'BPM'} value={bpm} onChange={setBpm} min={30} max={300} step={5} fallback={80} className="tempo-field" />
        <span className="transport-status" aria-live="polite">
          {countBeat ? `Count-in ${countBeat}…` : liveBpm ? `Now ${liveBpm} BPM` : ''}
        </span>
        <details className="transport-options" open={showOptions} onToggle={(e) => setShowOptions(e.currentTarget.open)}>
          <summary>Playback</summary>
          <div className="transport-panel">
            <div className="toggles">
              <Toggle checked={click} onChange={setClick}>
                Click
              </Toggle>
              <Toggle checked={countIn} onChange={setCountIn}>
                Count-in
              </Toggle>
              <Toggle checked={loop} onChange={setLoop}>
                Loop
              </Toggle>
            </div>
            <Choice
              label="Speed up each loop"
              size="small"
              options={SPEED_UPS.map((n) => ({ value: n, label: n ? `+${n}` : 'Off', title: n ? `+${n} BPM each loop` : undefined, disabled: !loop }))}
              value={speedUp}
              onChange={setSpeedUp}
            />
          </div>
        </details>
      </div>

      <Tab columns={columns} tuningNames={tuning.map((_, i) => (i === tuning.length - 1 ? stringName(i).toLowerCase() : stringName(i)))} columnWidth={columnWidth} active={activeIndex} onSelect={selectColumn} follow={playing} />
      <p className="hint">
        {has('progression') ? '↓ ↑ = down / up strum · p = thumb, i m a = fingers · ' : ''}
        Tap a column to hear it · Space plays and stops
      </p>

      <Fretboard tuning={tuning} notes={fretboardNotes} label={fretLabel} stringName={stringName} onNoteClick={(n) => playEvent({ notes: [n] })} />
      {has('key') && !has('progression') && <DiatonicChords keyName={key} scaleId={has('scale7') ? s.scale7 : s.scale} onScaleChange={has('scale') || has('scale7') ? undefined : (id) => set({ scale: id })} />}
    </section>
  )
}
