import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CHORD_LENGTHS,
  CHROMATIC_PATTERNS,
  DEFAULT_SETTINGS,
  EXERCISES,
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
import { CHORDS, KEYS, SCALES, noteToPc, pcName, scalePosition, stringSets, usesFlats } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import Fretboard from './Fretboard.jsx'
import Tab from './Tab.jsx'
import TuningSelect from './TuningSelect.jsx'

const GROUPS = [...new Set(EXERCISES.map((e) => e.group))]
const SEVEN_NOTE_SCALES = Object.entries(SCALES).filter(([, s]) => s.intervals.length === 7)
const INVERSIONS = ['Root', '1st', '2nd']
const ARP_DIRECTIONS = { up: 'Up', updown: 'Up & down', alternate: 'Alternate up / down' }
const SPEED_UPS = [0, 2, 5, 10]
const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
// Tab column width by the shortest note in the exercise, so 16ths pack tighter than quarters.
const COLUMN_WIDTHS = { 2: 20, 3: 22, 4: 24, 6: 26, 12: 34 }
const clampBpm = (bpm) => Math.max(30, Math.min(300, Number(bpm) || 80))
const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)
const fretHint = (notes) => {
  const frets = notes.map((n) => n.fret)
  return `fr ${Math.min(...frets)}–${Math.max(...frets)}`
}

/** Generated practice exercises (scales, arpeggios, progressions, fingerstyle) with tab that plays along in time. */
export default function Exercises({ tuning, tuningId, onTuningChange, stringName }) {
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

  const score = useMemo(() => buildExercise(stored, tuning), [stored, tuning])
  const s = score.settings
  const set = (patch) => setStored({ ...s, ...patch })
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
    if (!playing) setActive(null)
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

  const noteName = (n) => pcName(n.pitch, flats)
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
    return intervals.map((_, i) => fretHint(scalePosition(rootPc, intervals, tuning, i)))
  })()
  const sets = stringSets(3, tuning.length)
  const stringLabel = (i) => `${ORDINALS[tuning.length - i]} (${stringName(i)})`

  const title = (() => {
    if (exercise.id === 'progression' || exercise.id === 'fingerstyle') return `${exercise.name} in ${key}`
    if (exercise.id === 'chromatic') return `${exercise.name}: ${s.fingers}`
    if (exercise.id === 'chordArpeggio') return `${key}${(CHORDS[s.chord] ?? CHORDS.maj7).symbol} arpeggio`
    return `${key} ${scale.name}: ${exercise.name.toLowerCase()}`
  })()

  return (
    <section className="panel exercises">
      <div className="section-head">
        <h2>Exercises</h2>
        <TuningSelect value={tuningId} onChange={onTuningChange} aria-label="Tuning" />
      </div>

      {/* Phones get a compact menu; wider screens show every exercise as a button. */}
      <label className="exercise-select">
        Exercise
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
      <div className="exercise-picker">
        {GROUPS.map((group) => (
          <div key={group} className="exercise-group" role="group" aria-label={group}>
            <span className="picker-label">{group}</span>
            <div className="exercise-buttons">
              {EXERCISES.filter((e) => e.group === group).map((e) => (
                <button key={e.id} type="button" className={e.id === exercise.id ? 'on' : ''} aria-pressed={e.id === exercise.id} onClick={() => set({ exercise: e.id })}>
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="exercise-about">{exercise.about}</p>

      {has('key') && (
        <div className="keys" role="group" aria-label="Key">
          {KEYS.map((k) => (
            <button key={k} className={k === key ? 'on' : ''} onClick={() => set({ key: k })} aria-pressed={k === key}>
              {k}
            </button>
          ))}
        </div>
      )}

      <div className="controls exercise-controls">
        {has('scale') && (
          <label>
            Scale
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
          <label>
            Scale
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
          <label>
            Chord
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
          <label>
            Pattern
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
          <label>
            String
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
          <label>
            Fingers
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
          <label>
            Start fret
            <input type="number" min="1" max="19" value={s.startFret} onChange={(e) => set({ startFret: e.target.value })} />
          </label>
        )}
        {has('arpSize') && (
          <div className="segmented small" role="group" aria-label="Chord size">
            {[
              ['triads', 'Triads'],
              ['sevenths', '7th chords'],
            ].map(([id, text]) => (
              <button key={id} type="button" className={s.arpSize === id ? 'on' : ''} aria-pressed={s.arpSize === id} onClick={() => set({ arpSize: id })}>
                {text}
              </button>
            ))}
          </div>
        )}
        {has('arpDirection') && (
          <label>
            Direction
            <select value={s.arpDirection} onChange={(e) => set({ arpDirection: e.target.value })}>
              {Object.entries(ARP_DIRECTIONS).map(([id, text]) => (
                <option key={id} value={id}>
                  {text}
                </option>
              ))}
            </select>
          </label>
        )}
        {has('stringSet') && (
          <label>
            Strings
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
          <div className="segmented small" role="group" aria-label="Inversion">
            {INVERSIONS.map((text, i) => (
              <button key={text} type="button" className={s.inversion === i ? 'on' : ''} aria-pressed={s.inversion === i} onClick={() => set({ inversion: i })}>
                {text}
              </button>
            ))}
          </div>
        )}
        {has('triadStyle') && (
          <div className="segmented small" role="group" aria-label="Triad style">
            {[
              ['arpeggio', 'Arpeggiated'],
              ['block', 'Block chords'],
            ].map(([id, text]) => (
              <button key={id} type="button" className={s.triadStyle === id ? 'on' : ''} aria-pressed={s.triadStyle === id} onClick={() => set({ triadStyle: id })}>
                {text}
              </button>
            ))}
          </div>
        )}
        {has('rate') && (
          <label>
            Notes
            <select value={s.rate} onChange={(e) => set({ rate: e.target.value })}>
              {Object.entries(RATES).map(([id, r]) => (
                <option key={id} value={id} disabled={!rateFits(id, meter)}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Time
          <select value={meter.id} onChange={(e) => set({ meter: e.target.value })}>
            {Object.keys(METERS).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      </div>

      {has('progression') && (
        <div className="progression-editor">
          <label className="progression-input">
            Progression
            <input type="text" value={s.progression} onChange={(e) => set({ progression: e.target.value })} spellCheck="false" autoCapitalize="off" placeholder="e.g. I V vi IV, ii7 V7 Imaj7 or Am F C G" />
          </label>
          <div className="progression-actions">
            <select value="" onChange={(e) => e.target.value && set({ progression: e.target.value })} aria-label="Common progressions">
              <option value="">Common progressions…</option>
              {PROGRESSIONS.map((p) => (
                <option key={p.name} value={p.text}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => set({ progression: randomProgression('major', 4) })}>
              🎲 Major
            </button>
            <button type="button" onClick={() => set({ progression: randomProgression('minor', 4) })}>
              🎲 Minor
            </button>
          </div>
          {score.errors.length > 0 && (
            <p className="progression-error" role="alert">
              Didn’t understand: {score.errors.join(', ')}. Use Roman numerals (I, ii7, bVII) or chord names (Am, F#m7).
            </p>
          )}
          <div className="controls">
            <label className="check">
              <input type="checkbox" checked={s.sevenths} onChange={(e) => set({ sevenths: e.target.checked })} />
              Make them 7th chords
            </label>
            <label>
              Length
              <select value={s.chordLength} onChange={(e) => set({ chordLength: Number(e.target.value) })}>
                {Object.entries(CHORD_LENGTHS).map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Voicings
              <select value={s.neck} onChange={(e) => set({ neck: e.target.value })}>
                {Object.entries(NECK_AREAS).map(([id, a]) => (
                  <option key={id} value={id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            {has('strum') && (
              <label>
                Strum
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
              <label>
                Pattern
                <select value={s.picking} onChange={(e) => set({ picking: e.target.value })}>
                  {Object.entries(PICKING).map(([id, p]) => (
                    <option key={id} value={id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      )}

      {positions.length > 0 && (
        <div className="options" role="group" aria-label="Position">
          {positions.map((hint, i) => (
            <button key={i} className={Math.min(s.position, positions.length - 1) === i ? 'on' : ''} onClick={() => set({ position: i })}>
              Position {i + 1}
              <small>{hint}</small>
            </button>
          ))}
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
          <div className="segmented small" role="group" aria-label="Note labels">
            <button className={labels === 'notes' ? 'on' : ''} onClick={() => setLabels('notes')}>
              Notes
            </button>
            <button className={labels !== 'notes' ? 'on' : ''} onClick={() => setLabels('degrees')}>
              {exercise.id === 'chromatic' ? 'Fingers' : 'Intervals'}
            </button>
          </div>
        )}
      </div>

      <div className="transport">
        <button type="button" className="primary play-button" onClick={togglePlay} disabled={!events.length} aria-pressed={playing}>
          {playing ? '■ Stop' : '▶ Play'}
        </button>
        <label>
          {meter.unit === 8 ? 'BPM (8ths)' : 'BPM'}
          <input type="number" min="30" max="300" value={bpm} onChange={(e) => setBpm(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={click} onChange={(e) => setClick(e.target.checked)} />
          Click
        </label>
        <label className="check">
          <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} />
          Count-in
        </label>
        <label className="check">
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          Loop
        </label>
        <label>
          Speed up
          <select value={speedUp} onChange={(e) => setSpeedUp(Number(e.target.value))} disabled={!loop}>
            {SPEED_UPS.map((n) => (
              <option key={n} value={n}>
                {n ? `+${n} BPM each loop` : 'Off'}
              </option>
            ))}
          </select>
        </label>
        <span className="transport-status" aria-live="polite">
          {countBeat ? `Count-in ${countBeat}…` : liveBpm ? `Now ${liveBpm} BPM` : ''}
        </span>
      </div>

      {playing && (
        <button type="button" className="primary floating-stop" onClick={togglePlay}>
          ■ Stop
        </button>
      )}
      <Tab columns={columns} tuningNames={tuning.map((_, i) => (i === tuning.length - 1 ? stringName(i).toLowerCase() : stringName(i)))} columnWidth={columnWidth} active={activeIndex} onSelect={selectColumn} follow={playing} />
      <p className="hint">
        {has('progression') ? '↓ / ↑ = down / up strum · p = thumb, i m a = fingers. ' : ''}
        Space plays / stops · click a column (or ← / →) to hear it.
      </p>

      <Fretboard tuning={tuning} notes={fretboardNotes} label={fretLabel} stringName={stringName} onNoteClick={(n) => playEvent({ notes: [n] })} />

      <p className="hint">Tip: start slow enough to play it perfectly, then let “Speed up” push the tempo a little each time round.</p>
    </section>
  )
}

