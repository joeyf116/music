import { useEffect, useRef, useState } from 'react'
import { playPitch } from '../lib/audio.js'
import { DIRECTIONS, INTERVALS, PRESETS, answerLabel, intervalInfo, pitchesOf, randomQuestion } from '../lib/intervalQuiz.js'
import { pcName } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import Fretboard from './Fretboard.jsx'
import TuningSelect from './TuningSelect.jsx'

const RANGES = [
  { maxFret: 5, label: 'Frets 0–5' },
  { maxFret: 12, label: 'Frets 0–12' },
  { maxFret: 22, label: 'Whole neck' },
]
const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
// Seconds between the two notes, how long each rings, and the pause before a loop repeats.
const GAP = 0.9
const RING = 1.4
const LOOP_PAUSE = 0.8
const DIRECTION_TEXT = { up: 'going up', down: 'going down', together: 'played together' }
const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)

/** "Guess the interval": the root is shown on the neck, the two notes are played, name the gap by ear. */
export default function Quiz({ tuning, tuningId, onTuningChange, stringName }) {
  const [maxFret, setMaxFret] = usePersistentState('music.intervalFrets', 12)
  const [enabled, setEnabled] = usePersistentState('music.intervals', PRESETS[0].semitones)
  const [direction, setDirection] = usePersistentState('music.intervalDirection', 'up')
  const [loop, setLoop] = usePersistentState('music.intervalLoop', false)
  const [autoPlay, setAutoPlay] = usePersistentState('music.intervalAutoPlay', true)
  const [best, setBest] = usePersistentState('music.intervalBest', 0)
  const choices = INTERVALS.filter((i) => enabled.includes(i.semitones))
  const semitones = choices.length ? choices.map((i) => i.semitones) : PRESETS[0].semitones
  const [question, setQuestion] = useState(() => randomQuestion(tuning, maxFret, semitones, direction))
  const [guesses, setGuesses] = useState([])
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ right: 0, tries: 0 })
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [playing, setPlaying] = useState(false)
  const sound = useRef({ timers: [], stops: [] })

  const stop = () => {
    sound.current.timers.forEach(clearTimeout)
    sound.current.stops.forEach((s) => s())
    sound.current = { timers: [], stops: [] }
    setPlaying(false)
  }

  // Plays root then second note (or both at once), repeating until stopped when `repeat` is on.
  const play = (q = question, { repeat = loop, size = q.semitones } = {}) => {
    stop()
    const [root] = pitchesOf(q, tuning)
    const second = root + (q.direction === 'down' ? -size : size)
    const together = q.direction === 'together'
    const length = (together ? 0 : GAP) + RING
    const round = () => {
      sound.current.stops.push(playPitch(root, 0, RING), playPitch(second, together ? 0 : GAP, RING))
      sound.current.timers.push(setTimeout(repeat ? round : () => setPlaying(false), (length + (repeat ? LOOP_PAUSE : 0)) * 1000))
    }
    setPlaying(true)
    round()
  }

  const next = () => {
    const q = randomQuestion(tuning, maxFret, semitones, direction, Math.random, question)
    setQuestion(q)
    setGuesses([])
    setRevealed(false)
    setFeedback('')
    if (autoPlay && q) play(q)
    else stop()
  }

  // A new tuning or setting makes the current question unfair, so start a fresh one.
  const settingsKey = `${tuning.join(',')}|${maxFret}|${semitones.join(',')}|${direction}`
  const lastSettings = useRef(settingsKey)
  useEffect(() => {
    if (lastSettings.current === settingsKey) return
    lastSettings.current = settingsKey
    next()
  })
  useEffect(() => stop, [])

  const solved = question && guesses.includes(question.semitones)
  const done = solved || revealed
  const firstTry = guesses.length === 0 && !revealed

  const finish = (correct) => {
    if (firstTry) setScore({ right: score.right + (correct ? 1 : 0), tries: score.tries + 1 })
    const nextStreak = correct && firstTry ? streak + 1 : 0
    setStreak(nextStreak)
    if (nextStreak > best) setBest(nextStreak)
  }

  const answer = (size) => {
    if (!question) return
    const info = intervalInfo(size)
    // After the answer is known, every button just plays that interval from the same root for comparison.
    if (done) return play(question, { repeat: false, size })
    if (guesses.includes(size)) return
    setGuesses([...guesses, size])
    if (size === question.semitones) {
      finish(true)
      const cue = question.direction === 'up' ? ` Think “${info.song}”.` : ''
      setFeedback(`${firstTry ? 'Correct!' : 'Got it.'} That's a ${info.name.toLowerCase()} (${size} frets apart).${cue}`)
      play(question, { repeat: false })
    } else {
      if (firstTry) finish(false)
      setFeedback(`Not a ${info.name.toLowerCase()}: that's how one sounds. Listen again and try another.`)
      play(question, { repeat: false, size })
    }
  }

  const reveal = () => {
    finish(false)
    setRevealed(true)
    const info = intervalInfo(question.semitones)
    setFeedback(`It was a ${info.name.toLowerCase()} (${question.semitones} frets apart). Think “${info.song}”.`)
    play(question, { repeat: false })
  }

  const toggleInterval = (size) => {
    const list = enabled.includes(size) ? enabled.filter((s) => s !== size) : [...enabled, size].sort((a, b) => a - b)
    if (list.length) setEnabled(list)
  }

  // Space plays/stops and N (or Enter once answered) moves on, unless a field or button has focus.
  const keyRef = useRef(null)
  useEffect(() => {
    keyRef.current = (e) => {
      if (isTyping(document.activeElement)) return
      const onButton = document.activeElement?.tagName === 'BUTTON'
      if (e.key === ' ' && !onButton) {
        e.preventDefault()
        if (playing) stop()
        else play()
      } else if (e.key === 'n' || e.key === 'N' || (e.key === 'Enter' && done && !onButton)) next()
    }
  })
  useEffect(() => {
    const onKey = (e) => keyRef.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const stringLabel = (s) => `${ORDINALS[tuning.length - s] ?? ''} string`
  const notes = []
  if (question) {
    notes.push({ ...question.root, role: 'root', level: 'shape' })
    if (done) notes.push({ ...question.target, role: 'correct', level: 'shape' })
  }

  return (
    <section className="panel quiz">
      <div className="section-head">
        <h2>Guess the interval</h2>
        <div className="quiz-settings">
          <div className="segmented small" role="group" aria-label="Direction">
            {DIRECTIONS.map((d) => (
              <button key={d.id} type="button" className={direction === d.id ? 'on' : ''} aria-pressed={direction === d.id} onClick={() => setDirection(d.id)}>
                {d.label}
              </button>
            ))}
          </div>
          <TuningSelect value={tuningId} onChange={onTuningChange} aria-label="Tuning" />
          <select value={maxFret} onChange={(e) => setMaxFret(Number(e.target.value))} aria-label="Fret range">
            {RANGES.map((r) => (
              <option key={r.maxFret} value={r.maxFret}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="interval-picker">
        <span className="picker-label">Intervals</span>
        <div className="presets" role="group" aria-label="Interval presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={p.semitones.join() === semitones.join() ? 'on' : ''} onClick={() => setEnabled(p.semitones)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="interval-toggles" role="group" aria-label="Intervals to practise">
          {INTERVALS.map((i) => (
            <button key={i.semitones} type="button" className={enabled.includes(i.semitones) ? 'on' : ''} aria-pressed={enabled.includes(i.semitones)} title={i.name} onClick={() => toggleInterval(i.semitones)}>
              {i.short}
            </button>
          ))}
        </div>
      </div>

      {question ? (
        <>
          <div className="quiz-listen">
            <button type="button" className="primary play-button" onClick={() => (playing ? stop() : play())} aria-pressed={playing}>
              {playing ? '■ Stop' : '▶ Play'}
            </button>
            <p className="quiz-prompt">
              The root is <strong>{pcName(pitchesOf(question, tuning)[0])}</strong> on the {stringLabel(question.root.string)}. Name the interval {DIRECTION_TEXT[question.direction]}.
            </p>
            <div className="listen-options">
              <label className="check">
                <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
                Loop until stopped
              </label>
              <label className="check">
                <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} />
                Auto-play next
              </label>
            </div>
          </div>

          <Fretboard
            tuning={tuning}
            notes={notes}
            label={(n) => (n.role === 'root' ? pcName(tuning[n.string] + n.fret) : answerLabel(question))}
            stringName={stringName}
            onNoteClick={(n) => playPitch(tuning[n.string] + n.fret)}
            frets={maxFret}
          />

          <div className="interval-answers" role="group" aria-label="Your answer">
            {choices.map((i) => {
              const state = done && i.semitones === question.semitones ? 'correct' : guesses.includes(i.semitones) ? 'wrong' : ''
              return (
                <button key={i.semitones} type="button" className={`answer ${state}`} onClick={() => answer(i.semitones)}>
                  <strong>{i.short}</strong>
                  <small>{i.name}</small>
                </button>
              )
            })}
          </div>

          <div className="quiz-footer">
            <p className="quiz-feedback" aria-live="polite">
              {feedback || (done ? '' : 'Press Play, listen, then pick the interval.')}
            </p>
            <div className="quiz-actions">
              <span className="quiz-score">
                Score {score.right}/{score.tries} · Streak {streak} · Best {best}
              </span>
              <button type="button" onClick={reveal} disabled={done}>
                Show answer
              </button>
              <button type="button" className="primary" onClick={() => next()}>
                Next interval
              </button>
            </div>
          </div>
          <p className="hint">Space plays or stops · N for the next interval · after answering, tap any interval to hear it from the same root.</p>
        </>
      ) : (
        <p className="empty">None of these intervals fit in this fret range. Try a wider range.</p>
      )}
    </section>
  )
}
