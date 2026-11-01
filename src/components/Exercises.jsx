import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, EXERCISES, PROGRESSIONS, buildExercise, randomProgression } from '../lib/exercises.js'
import {
  EXERCISE_GROUPS,
  SPEED_UPS,
  exerciseColumnWidth,
  exerciseColumns,
  exerciseFields,
  exerciseLayoutField,
  exerciseNeckLabel,
  exerciseNeckNotes,
  exercisePositions,
  exerciseTitle,
  isMelodic,
} from '../lib/exerciseView.js'
import { progressionToken } from '../lib/fretboardView.js'
import { playEvent, startPlayback } from '../lib/player.js'
import { sevenNoteScale } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Choice, Field, Stepper, Toggle } from './controls.jsx'
import DiatonicChords from './DiatonicChords.jsx'
import Fretboard from './Fretboard.jsx'
import KeyPicker from './KeyPicker.jsx'
import Menu from './Menu.jsx'
import Tab from './Tab.jsx'
import TuningSelect from './TuningSelect.jsx'
import { Disclosure } from './layout.jsx'

const clampBpm = (bpm) => Math.max(30, Math.min(300, Number(bpm) || 80))
const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)

/** One exercise setting (see exerciseFields): a list, a few buttons or a number. */
function ExerciseField({ field, onChange }) {
  if (field.kind === 'stepper') return <Stepper label={field.label} value={field.value} onChange={onChange} min={field.min} max={field.max} fallback={field.fallback} />
  if (field.kind === 'choice') return <Choice label={field.label} options={field.options} value={field.value} onChange={onChange} />
  return (
    <label className="field">
      <span className="field-label">{field.label}</span>
      <select value={field.value} onChange={(e) => onChange(field.options.find((o) => String(o.value) === e.target.value).value)}>
        {field.options.map((o) => (
          <option key={String(o.value)} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
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

  const melodic = isMelodic(score)
  const columns = exerciseColumns(score, labels)
  const columnWidth = exerciseColumnWidth(score)
  const fretboardNotes = exerciseNeckNotes(score, activeIndex)
  const fretLabel = (n) => exerciseNeckLabel(score, labels, n)
  const positions = exercisePositions(score, tuning)
  const layoutField = exerciseLayoutField(score)
  const title = exerciseTitle(score)

  return (
    <div className="exercises">
      <div className="section-head">
        <h2>Scale &amp; chord drills</h2>
        <Field label="Tuning" className="head-field">
          <TuningSelect value={tuningId} onChange={onTuningChange} />
        </Field>
      </div>

      {/* One grouped menu at every width: the exercise, then just the settings that exercise uses. */}
      <label className="field exercise-field">
        <span className="field-label">Exercise</span>
        <select value={exercise.id} onChange={(e) => set({ exercise: e.target.value })}>
          {EXERCISE_GROUPS.map((group) => (
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
      <Disclosure label="Why practise this?" quiet className="exercise-about">
        <p>{exercise.about}</p>
        <p>Start slow enough to play it perfectly, then let “Speed up” push the tempo a little each time round.</p>
      </Disclosure>

      {has('key') && <KeyPicker value={key} onChange={(k) => set({ key: k })} />}

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
<Menu
                label="Common progressions"
                items={PROGRESSIONS.map((p) => ({ label: p.name, detail: p.text, onSelect: () => set({ progression: p.text }) }))}
              >
                Common ▾
              </Menu>
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
        {exerciseFields(score, tuning, stringName).map((field) => (
          <ExerciseField key={field.id} field={field} onChange={(value) => set({ [field.id]: value, ...(field.resetsPosition ? { position: 0 } : {}) })} />
        ))}
      </div>

      {layoutField && <ExerciseField field={layoutField} onChange={(v) => set({ layout: v })} />}

      {positions.length > 0 && (
        <div className="field">
          <span className="field-label" id="exercise-position-label">
            {s.layout === 'across' ? 'Starts in position' : 'Position'}
          </span>
          <div className="options" role="group" aria-labelledby="exercise-position-label">
            {positions.map((p, i) => (
              <button key={i} className={Math.min(s.position, positions.length - 1) === i ? 'on' : ''} onClick={() => set({ position: i })}>
                {p.label}
                <small>{p.hint}</small>
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
        <Disclosure label="Playback" summary={[click && 'Click', countIn && 'Count-in', loop && 'Loop'].filter(Boolean).join(' · ') || 'No click'} open={showOptions} onToggle={setShowOptions} className="transport-options">
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
        </Disclosure>
      </div>

      <Tab columns={columns} tuningNames={tuning.map((_, i) => (i === tuning.length - 1 ? stringName(i).toLowerCase() : stringName(i)))} columnWidth={columnWidth} active={activeIndex} onSelect={selectColumn} follow={playing} />
      <p className="hint">
        {has('progression') ? '↓ ↑ = down / up strum · p = thumb, i m a = fingers · ' : ''}
        Tap a column to hear it · Space plays and stops
      </p>

      <Fretboard tuning={tuning} notes={fretboardNotes} label={fretLabel} stringName={stringName} onNoteClick={(n) => playEvent({ notes: [n] })} />
      {has('key') && !has('progression') && <DiatonicChords keyName={key} scaleId={has('scale7') ? s.scale7 : s.scale} onScaleChange={has('scale') || has('scale7') ? undefined : (id) => set({ scale: id })} />}
    </div>
  )
}
