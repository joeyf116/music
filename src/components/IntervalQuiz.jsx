import { useEffect, useReducer, useRef, useState } from 'react'
import { playPitch } from '../lib/audio.js'
import {
  DIRECTIONS,
  DIRECTION_TEXT,
  FRET_RANGES as RANGES,
  INTERVALS,
  PRESETS,
  answerLabel,
  gameReducer,
  initialGame,
  intervalPresetName,
  intervalQuizText,
  intervalWithArticle as withArticle,
  pitchesOf,
  randomQuestion,
  roundState,
  stringOrdinal,
  toggleInterval as toggledIntervals,
} from '../lib/intervalQuiz.js'
import { pcName } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Choice, Field, Toggle } from './controls.jsx'
import Fretboard from './Fretboard.jsx'
import TuningSelect from './TuningSelect.jsx'
import { Disclosure } from './layout.jsx'

const DIRECTION_OPTIONS = DIRECTIONS.map((d) => ({ value: d.id, label: d.label }))
const RANGE_OPTIONS = RANGES.map((r) => ({ value: r.maxFret, label: r.label.replace('Frets ', '') }))
// Seconds between the two notes, how long each rings, and the pause before a loop repeats.
const GAP = 0.9
const RING = 1.4
const LOOP_PAUSE = 0.8
// Keyboard shortcuts for the answer buttons, in order.
const ANSWER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=']
const STATS_KEY = 'music.intervalStats'
const BEST_KEY = 'music.intervalBest'
const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)

const load = (key, fallback) => {
  try {
    const stored = window.localStorage.getItem(key)
    return stored === null ? fallback : JSON.parse(stored)
  } catch {
    return fallback
  }
}
const save = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable (private mode); stats just won't persist.
  }
}

/** "Guess the interval": the root is shown on the neck, the two notes are played, name the gap by ear. */
export default function IntervalQuiz({ tuning, tuningId, onTuningChange, stringName }) {
  const [maxFret, setMaxFret] = usePersistentState('music.intervalFrets', 12)
  const [enabled, setEnabled] = usePersistentState('music.intervals', PRESETS[0].semitones)
  const [direction, setDirection] = usePersistentState('music.intervalDirection', 'up')
  const [loop, setLoop] = usePersistentState('music.intervalLoop', false)
  const [autoPlay, setAutoPlay] = usePersistentState('music.intervalAutoPlay', true)
  // Settings start folded on phones so the game itself is on screen first.
  const [settingsOpen, setSettingsOpen] = usePersistentState('music.intervalSettingsOpen', !window.matchMedia?.('(max-width: 640px)').matches)
  const choices = INTERVALS.filter((i) => enabled.includes(i.semitones))
  const semitones = choices.length ? choices.map((i) => i.semitones) : PRESETS[0].semitones
  const [game, dispatch] = useReducer(gameReducer, null, () =>
    initialGame(randomQuestion(tuning, maxFret, semitones, direction), { stats: load(STATS_KEY, {}), best: load(BEST_KEY, 0) }),
  )
  const [playing, setPlaying] = useState(false)
  const sound = useRef({ timers: [], stops: [] })
  const nextButton = useRef(null)

  const { question, guesses, score, streak, best, stats } = game
  const state = roundState(game)
  const done = state === 'solved' || state === 'revealed'
  useEffect(() => save(STATS_KEY, stats), [stats])
  useEffect(() => save(BEST_KEY, best), [best])

  const stop = () => {
    sound.current.timers.forEach(clearTimeout)
    sound.current.stops.forEach((s) => s())
    sound.current = { timers: [], stops: [] }
    setPlaying(false)
  }

  // Plays root then second note (or both at once), repeating until stopped when `repeat` is on.
  // `size` plays a different interval from the same root, for comparing after an answer.
  const play = (q = question, { repeat = loop, size = q?.semitones } = {}) => {
    stop()
    if (!q) return
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
  const togglePlay = () => (playing ? stop() : play())

  // `sound` is false when settings change, so fiddling with options never starts a new sound.
  const next = ({ sound: withSound = autoPlay } = {}) => {
    const q = randomQuestion(tuning, maxFret, semitones, direction, Math.random, question)
    dispatch({ type: 'next', question: q })
    if (withSound && q) play(q)
    else stop()
  }

  // A new tuning or setting makes the current question unfair, so start a fresh one (quietly).
  const settingsKey = `${tuning.join(',')}|${maxFret}|${semitones.join(',')}|${direction}`
  const lastSettings = useRef(settingsKey)
  useEffect(() => {
    if (lastSettings.current === settingsKey) return
    lastSettings.current = settingsKey
    next({ sound: false })
  })
  useEffect(() => stop, [])

  // Once a question is over, move focus to "Next" so Enter carries on.
  useEffect(() => {
    if (done) nextButton.current?.focus({ preventScroll: true })
  }, [done])

  const answer = (size) => {
    if (!question) return
    // After the answer is known, every button plays that interval from the same root for comparison.
    if (done) return play(question, { repeat: false, size })
    if (guesses.includes(size)) return
    dispatch({ type: 'guess', size })
    // A right answer replays the pair so the sound sticks with the shape now shown on the neck.
    // A wrong one stays on this question and stays quiet; Play repeats it.
    if (size === question.semitones) play(question, { repeat: false })
  }

  const reveal = () => {
    dispatch({ type: 'reveal' })
    play(question, { repeat: false })
  }

  const toggleInterval = (size) => {
    const list = toggledIntervals(enabled, size)
    if (list) setEnabled(list)
  }

  // Space plays/stops anywhere on the page (it never presses a focused button, so it can't skip a
  // question), number keys answer, and N or Enter moves on once the question is over.
  const keyRef = useRef(null)
  useEffect(() => {
    keyRef.current = (e) => {
      if (isTyping(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey) return
      const onButton = document.activeElement?.tagName === 'BUTTON'
      const index = ANSWER_KEYS.indexOf(e.key)
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else if (index >= 0 && choices[index]) {
        answer(choices[index].semitones)
      } else if (e.key === 'n' || e.key === 'N' || (e.key === 'Enter' && done && !onButton)) {
        next()
      }
    }
  })
  useEffect(() => {
    const onKey = (e) => keyRef.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const wrongGuesses = guesses.filter((g) => g !== question?.semitones)
  const { feedback, compare: compareHint } = intervalQuizText(game)

  const stringLabel = (s) => stringOrdinal(s, tuning.length)
  const notes = []
  if (question) {
    notes.push({ ...question.root, role: 'root', level: playing ? 'active' : 'shape' })
    if (done) notes.push({ ...question.target, role: 'correct', level: 'shape' })
  }

  const presetName = intervalPresetName(semitones)
  const settingsSummary = [DIRECTIONS.find((d) => d.id === direction)?.label, presetName ?? choices.map((i) => i.short).join(' '), RANGES.find((r) => r.maxFret === maxFret)?.label].join(' · ')
  const statRows = choices.map((i) => ({ ...i, ...(stats[i.semitones] ?? { right: 0, tries: 0 }) }))
  const tried = statRows.filter((r) => r.tries)

  return (
    <div className="quiz">
      <div className="section-head">
        <h2>Guess the interval</h2>
        <span className="quiz-score" aria-live="polite">
          Score {score.right}/{score.tries} · Streak {streak} · Best {best}
        </span>
      </div>

      <div className="field quiz-setup">
        <span className="field-label" id="interval-presets">Intervals to practise</span>
        <div className="presets" role="group" aria-labelledby="interval-presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={p.label === presetName ? 'on' : ''} aria-pressed={p.label === presetName} onClick={() => setEnabled(p.semitones)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {question ? (
        <>
          <div className="quiz-listen">
            <button type="button" className="primary play-button" onClick={togglePlay} aria-pressed={playing}>
              {playing ? '■ Stop' : done ? '▶ Replay' : '▶ Play'}
            </button>
            <p className="quiz-prompt">
              The root is <strong>{pcName(pitchesOf(question, tuning)[0])}</strong> on the {stringLabel(question.root.string)}. Name the interval {DIRECTION_TEXT[question.direction]}.
            </p>
          </div>

          <Fretboard
            tuning={tuning}
            notes={notes}
            label={(n) => (n.role === 'root' ? pcName(tuning[n.string] + n.fret) : answerLabel(question))}
            stringName={stringName}
            onNoteClick={(n) => playPitch(tuning[n.string] + n.fret)}
            frets={maxFret}
          />

          <p className={`quiz-feedback ${state}${wrongGuesses.length && !done ? ' missed' : ''}`} aria-live="polite">
            {feedback}
            {compareHint && <small>{compareHint}</small>}
          </p>

          <div className={`interval-answers${done ? ' comparing' : ''}`} role="group" aria-label={done ? 'Hear an interval from this root' : 'Your answer'}>
            {choices.map((i, index) => {
              const mark = done && i.semitones === question.semitones ? 'correct' : guesses.includes(i.semitones) ? 'wrong' : ''
              return (
                <button
                  key={i.semitones}
                  type="button"
                  className={`answer ${mark}`}
                  onClick={() => answer(i.semitones)}
                  disabled={!done && mark === 'wrong'}
                  aria-label={done ? `Hear ${withArticle(i.name)}` : i.name}
                >
                  {ANSWER_KEYS[index] && <kbd>{ANSWER_KEYS[index]}</kbd>}
                  <strong>
                    {done && <span aria-hidden="true">🔊 </span>}
                    {i.short}
                  </strong>
                  <small>{i.name}</small>
                </button>
              )
            })}
          </div>

          <div className="quiz-actions">
            {!done && (
              <>
                <button type="button" onClick={reveal}>
                  Show answer
                </button>
                <button type="button" onClick={() => next()}>
                  Skip
                </button>
              </>
            )}
            {done && (
              <button type="button" className="primary next-button" ref={nextButton} onClick={() => next()}>
                Next interval →
              </button>
            )}
          </div>
          <p className="hint keys-hint">Keys: Space play/stop · 1–{Math.min(choices.length, 9)} answer · Enter or N next.</p>

          {tried.length > 0 && (
            <Disclosure label="Accuracy by interval" className="quiz-stats">
              <ul>
                {statRows.map((r) => (
                  <li key={r.semitones}>
                    <span className="stat-name">{r.short}</span>
                    <span className="stat-bar" aria-hidden="true">
                      <span style={{ width: `${r.tries ? (r.right / r.tries) * 100 : 0}%` }} />
                    </span>
                    <span className="stat-value">{r.tries ? `${Math.round((r.right / r.tries) * 100)}% of ${r.tries}` : 'not yet'}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => dispatch({ type: 'resetStats' })}>
                Reset stats
              </button>
            </Disclosure>
          )}
        </>
      ) : (
        <p className="empty">None of these intervals fit in this fret range. Try a wider range.</p>
      )}

      <Disclosure label="Settings" summary={settingsSummary} open={settingsOpen} onToggle={setSettingsOpen} className="quiz-settings-panel">
        <div className="field-grid quiz-settings">
          <Choice label="Direction" options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
          <Choice label="Frets" options={RANGE_OPTIONS} value={maxFret} onChange={setMaxFret} />
          <Field label="Tuning">
            <TuningSelect value={tuningId} onChange={onTuningChange} />
          </Field>
          <div className="toggles">
            <Toggle checked={loop} onChange={setLoop}>
              Loop until stopped
            </Toggle>
            <Toggle checked={autoPlay} onChange={setAutoPlay}>
              Auto-play next
            </Toggle>
          </div>
        </div>
        <div className="interval-picker">
          <span className="field-label">Or pick intervals one by one</span>
          <div className="interval-toggles" role="group" aria-label="Intervals to practise">
            {INTERVALS.map((i) => (
              <button key={i.semitones} type="button" className={enabled.includes(i.semitones) ? 'on' : ''} aria-pressed={enabled.includes(i.semitones)} title={i.name} onClick={() => toggleInterval(i.semitones)}>
                {i.short}
              </button>
            ))}
          </div>
        </div>
      </Disclosure>
    </div>
  )
}
