import { useEffect, useRef, useState } from 'react'
import { playPitch } from '../lib/audio.js'
import { answerFrets, isCorrect, quizNoteName, randomQuestion } from '../lib/quiz.js'
import { pcName } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import Fretboard from './Fretboard.jsx'

const RANGES = [
  { maxFret: 5, label: 'Frets 0–5' },
  { maxFret: 12, label: 'Frets 0–12' },
  { maxFret: 22, label: 'Whole neck' },
]
const NEXT_DELAY = 700
const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']

/** "Find the note" quiz: click where the asked note sits on the asked string. */
export default function Quiz({ tuning, stringName }) {
  const [maxFret, setMaxFret] = usePersistentState('music.quizFrets', 12)
  const [best, setBest] = usePersistentState('music.quizBest', 0)
  const [question, setQuestion] = useState(() => randomQuestion(tuning, maxFret))
  const [picks, setPicks] = useState([])
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ right: 0, tries: 0 })
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState('')
  const timer = useRef(null)

  const next = (from = question, frets = maxFret) => {
    clearTimeout(timer.current)
    setQuestion(randomQuestion(tuning, frets, Math.random, from))
    setPicks([])
    setRevealed(false)
  }

  // A new tuning or fret range makes the current question unfair, so start a fresh one.
  const settings = `${tuning.join(',')}|${maxFret}`
  const lastSettings = useRef(settings)
  useEffect(() => {
    if (lastSettings.current === settings) return
    lastSettings.current = settings
    next()
  })
  useEffect(() => () => clearTimeout(timer.current), [])

  const solved = picks.some((p) => p.correct)
  const target = quizNoteName(question.pc)
  // "6th string (E)" so the two E strings in standard tuning can't be confused.
  const stringLabel = (s) => `${ORDINALS[tuning.length - s] ?? ''} string (${stringName(s)})`
  const onString = stringLabel(question.string)

  const pick = (n) => {
    if (solved || revealed) return
    playPitch(tuning[n.string] + n.fret)
    const correct = isCorrect(question, n, tuning)
    setPicks([...picks.filter((p) => p.string !== n.string || p.fret !== n.fret), { string: n.string, fret: n.fret, correct }])
    setScore({ right: score.right + (correct ? 1 : 0), tries: score.tries + 1 })
    if (correct) {
      const nextStreak = streak + 1
      setStreak(nextStreak)
      if (nextStreak > best) setBest(nextStreak)
      setFeedback(`Correct, ${pcName(question.pc)} is at fret ${n.fret}.`)
      timer.current = setTimeout(() => next(question), NEXT_DELAY)
    } else {
      setStreak(0)
      setFeedback(`Not quite, that's ${pcName(tuning[n.string] + n.fret)}${n.string === question.string ? '' : ` on the ${stringLabel(n.string)}`}.`)
    }
  }

  const reveal = () => {
    setRevealed(true)
    setStreak(0)
    setFeedback(`${target} on the ${onString}: fret ${answerFrets(question, tuning, maxFret).join(' and ')}.`)
  }

  const notes = []
  for (let string = 0; string < tuning.length; string++) {
    for (let fret = 0; fret <= maxFret; fret++) notes.push({ string, fret, role: 'blank', level: 'hidden' })
  }
  if (revealed) answerFrets(question, tuning, maxFret).forEach((fret) => notes.push({ string: question.string, fret, role: 'correct', level: 'shape' }))
  picks.forEach((p) => notes.push({ ...p, role: p.correct ? 'correct' : 'wrong', level: 'shape' }))
  const byPosition = new Map(notes.map((n) => [`${n.string}-${n.fret}`, n]))

  return (
    <section className="panel quiz">
      <div className="section-head">
        <h2>Find the note</h2>
        <div className="quiz-settings">
          <select value={maxFret} onChange={(e) => setMaxFret(Number(e.target.value))} aria-label="Fret range">
            {RANGES.map((r) => (
              <option key={r.maxFret} value={r.maxFret}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="quiz-prompt">
        Find <strong>{target}</strong> on the <strong>{onString}</strong>
      </p>

      <Fretboard
        tuning={tuning}
        notes={[...byPosition.values()]}
        label={(n) => (n.level === 'hidden' ? '' : pcName(tuning[n.string] + n.fret))}
        stringName={stringName}
        onNoteClick={pick}
        frets={maxFret}
      />

      <div className="quiz-footer">
        <p className="quiz-feedback" aria-live="polite">
          {feedback}
        </p>
        <div className="quiz-actions">
          <span className="quiz-score">
            Score {score.right}/{score.tries} · Streak {streak} · Best {best}
          </span>
          <button type="button" onClick={reveal} disabled={solved || revealed}>
            Show answer
          </button>
          <button type="button" className="primary" onClick={() => next()}>
            Next note
          </button>
        </div>
      </div>
    </section>
  )
}
