import { useEffect, useReducer, useRef } from 'react'
import { playChord } from '../lib/audio.js'
import {
  CHORD_SIZES,
  DRILLS,
  KEY_MODES,
  KEY_SETS,
  QUALITY_RULES,
  buildHint,
  choiceHint,
  chordFormula,
  drillChordPitches,
  drillReducer,
  drillState,
  initialDrill,
  ordinal,
  pickedIn,
  qualityName,
  randomDrillQuestion,
  stackedThirds,
  toneName,
} from '../lib/theoryDrill.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Choice, Toggle } from './controls.jsx'
import { Disclosure } from './layout.jsx'

const ANSWER_KEYS = ['1', '2', '3', '4', '5', '6', '7']
const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)
const withArticle = (name) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`

/** How a chord is built: its notes against the formula, and the 3rds stacked between them. */
function ChordWorking({ chord }) {
  const formula = chordFormula(chord.type)
  const thirds = stackedThirds(chord.notes, chord.type)
  return (
    <div className="drill-working">
      <ol className="drill-formula" aria-label={`${chord.name}: ${chord.notes.join(' ')}`}>
        {chord.notes.map((n, i) => (
          <li key={i}>
            <strong>{n}</strong>
            <small>{formula[i]}</small>
          </li>
        ))}
      </ol>
      <p>
        {thirds.map((t, i) => (
          <span key={i}>
            {i > 0 && ', '}
            {t.from}→{t.to} {t.label} ({t.semitones} frets)
          </span>
        ))}
        . {qualityName(chord.type)} = {QUALITY_RULES[chord.type]}.
      </p>
    </div>
  )
}

/** "Build chords in a key": stack chords from a scale, name a key's chords, and spell chords from their formula. */
export default function TheoryDrill({ keyName }) {
  const [drill, setDrill] = usePersistentState('music.theoryDrill', 'build')
  const [size, setSize] = usePersistentState('music.theorySize', 'triads')
  const [keys, setKeys] = usePersistentState('music.theoryKeys', 'major')
  const [keyMode, setKeyMode] = usePersistentState('music.theoryKeyMode', 'any')
  const [autoPlay, setAutoPlay] = usePersistentState('music.theoryAutoPlay', true)
  const [settingsOpen, setSettingsOpen] = usePersistentState('music.theorySettingsOpen', false)
  const settings = { drill, size, keys, keyMode, keyName }
  const [game, dispatch] = useReducer(drillReducer, null, () => initialDrill(randomDrillQuestion(settings)))
  const nextButton = useRef(null)

  const { question, score } = game
  const state = drillState(game)
  const done = state === 'solved' || state === 'revealed'
  const step = question.steps[Math.min(game.step, question.steps.length - 1)]
  const chord = question.chord
  // Build questions start with tapping notes from the scale; every question ends with one multiple-choice step.
  const choiceIndex = question.steps.length - 1
  const choiceStep = question.steps[choiceIndex]
  const hear = () => playChord(drillChordPitches(chord))

  const next = () => dispatch({ type: 'next', question: randomDrillQuestion(settings, { previous: question }) })

  // Changing what's being practised starts a fresh question.
  const settingsKey = `${drill}|${size}|${keys}|${keyMode}|${keyName}`
  const lastSettings = useRef(settingsKey)
  useEffect(() => {
    if (lastSettings.current === settingsKey) return
    lastSettings.current = settingsKey
    next()
  })
  useEffect(() => {
    if (done) nextButton.current?.focus({ preventScroll: true })
  }, [done])

  const answer = (id) => {
    if (done) return
    const solves = game.step === question.steps.length - 1 && game.progress === step.answers.length - 1 && id === step.answers[game.progress]
    dispatch({ type: 'guess', id })
    // Right: hear the chord you just built. Wrong: stay quiet.
    if (solves && autoPlay) hear()
  }

  const keyRef = useRef(null)
  useEffect(() => {
    keyRef.current = (e) => {
      if (isTyping(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey) return
      const onButton = document.activeElement?.tagName === 'BUTTON'
      const index = ANSWER_KEYS.indexOf(e.key)
      if (index >= 0 && step.options[index] && !done) answer(step.options[index].id)
      else if (e.key === 'n' || e.key === 'N' || (e.key === 'Enter' && done && !onButton)) next()
    }
  })
  useEffect(() => {
    const onKey = (e) => keyRef.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const info = question.key
  const building = question.drill === 'build' && game.step === 0 && !done
  const picked = pickedIn(game, 0)
  const feedback = (() => {
    const numeral = info ? info.chords[question.degree].numeral : ''
    const where = info ? ` It’s the ${numeral} chord (the ${ordinal(question.degree + 1)}) in ${info.title}.` : ''
    const what = `${chord.name} (${chord.notes.join(' ')}) is ${withArticle(qualityName(chord.type).toLowerCase())} chord.`
    if (state === 'solved') return `${game.missed ? 'Got it.' : 'Right!'} ${what}${where}`
    if (state === 'revealed') return `${what}${where}`
    if (game.wrong.length) {
      if (building) return buildHint(question, game.progress)
      return choiceHint(question)
    }
    return question.drill === 'build' ? step.prompt : 'Pick one.'
  })()

  const keySet = KEY_SETS.find((k) => k.value === keys)
  const summary = [keySet?.label ?? 'Major', keyMode === 'fixed' ? `only ${keyName}` : 'any key', autoPlay ? 'plays when right' : 'silent'].join(' · ')

  return (
    <div className="quiz theory-drill">
      <div className="section-head">
        <h2>Build chords in a key</h2>
        <span className="quiz-score" aria-live="polite">
          Score {score.right}/{score.tries}
        </span>
      </div>

      <div className="field-grid drill-setup">
        <Choice label="Practise" options={DRILLS} value={drill} onChange={setDrill} />
        <Choice label="Chords" options={CHORD_SIZES} value={size} onChange={setSize} />
      </div>

      <p className="quiz-prompt drill-prompt">
        <strong>{question.prompt}</strong>
      </p>

      {question.drill === 'build' && (
        <div className="drill-build">
          <ol className="drill-notes" aria-label={info.title}>
            {info.scale.map((name, i) => {
              const at = picked.indexOf(i)
              const mark = at >= 0 ? 'correct' : building && game.wrong.includes(i) ? 'wrong' : ''
              return (
                <li key={i}>
                  <button type="button" className={`answer drill-note ${mark}`} onClick={() => answer(i)} disabled={!building || mark === 'wrong'} aria-label={`${name}${at >= 0 ? `, ${toneName(at)}` : ''}`}>
                    {ANSWER_KEYS[i] && building && <kbd>{ANSWER_KEYS[i]}</kbd>}
                    <strong>{name}</strong>
                    <small>{at >= 0 ? toneName(at) : i + 1}</small>
                  </button>
                </li>
              )
            })}
          </ol>
          <p className="drill-slots" aria-hidden="true">
            {question.steps[0].answers.map((t, k) => (
              <span key={k} className={k < picked.length ? 'filled' : ''}>
                <small>{toneName(k)}</small>
                {k < picked.length ? info.scale[t] : '?'}
              </span>
            ))}
          </p>
        </div>
      )}

      {(choiceIndex <= game.step || done) && (
        <div className="interval-answers drill-answers" role="group" aria-label={done ? 'Answer' : (choiceStep.prompt ?? 'Your answer')}>
          {choiceStep.options.map((o, index) => {
            const mark = pickedIn(game, choiceIndex).includes(o.id) ? 'correct' : !done && game.wrong.includes(o.id) ? 'wrong' : ''
            return (
              <button key={o.id} type="button" className={`answer ${mark}`} onClick={() => answer(o.id)} disabled={done || mark === 'wrong'} aria-label={o.sub ? `${o.label} (${o.sub})` : o.label}>
                {ANSWER_KEYS[index] && !done && <kbd>{ANSWER_KEYS[index]}</kbd>}
                <strong>{o.label}</strong>
                {o.sub && o.sub !== o.label && <small>{o.sub}</small>}
              </button>
            )
          })}
        </div>
      )}

      <p className={`quiz-feedback ${state}${game.wrong.length && !done ? ' missed' : ''}`} aria-live="polite">
        {feedback}
      </p>

      <div className="quiz-actions">
        {!done ? (
          <>
            <button type="button" onClick={() => dispatch({ type: 'reveal' })}>
              Show answer
            </button>
            <button type="button" onClick={next}>
              Skip
            </button>
          </>
        ) : (
          <>
            <button type="button" className="primary next-button" ref={nextButton} onClick={next}>
              Next question →
            </button>
            <button type="button" onClick={hear}>
              🔊 Hear {chord.name}
            </button>
          </>
        )}
      </div>

      {done && (
        <section className="drill-explain" aria-label="How it’s built">
          <h3>How {chord.name} is built</h3>
          <ChordWorking chord={chord} />
          {info && (
            <>
              <p>
                In {info.title} ({info.scale.join(' ')}), start on the {ordinal(question.degree + 1)} note and stack every other note: {chord.notes.join(' ')}.
              </p>
              <p className="drill-pattern">{info.parent ? `${info.title} borrows the chords of ${info.parent} major, started on its ${ordinal(info.modeIndex + 1)} note:` : `Every ${info.scaleId} key follows the same pattern:`}</p>
              <ol className="diatonic-chords">
                {info.chords.map((c) => (
                  <li key={c.degree}>
                    <button type="button" className={`diatonic-chord${c.degree === 0 ? ' tonic' : ''}${c.degree === question.degree ? ' on' : ''}`} onClick={() => playChord(drillChordPitches(c))} aria-label={`${c.numeral}: ${c.name} (play)`}>
                      <span className="numeral">{c.numeral}</span>
                      <strong className="chord-label">{c.name}</strong>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}

      <p className="hint keys-hint">Keys: 1–7 answer · Enter or N next.</p>

      <Disclosure label="Settings" summary={summary} open={settingsOpen} onToggle={setSettingsOpen} className="quiz-settings-panel">
        <div className="field-grid quiz-settings">
          <Choice label="Keys" options={KEY_SETS} value={keys} onChange={setKeys} />
          <Choice label="Key" options={KEY_MODES.map((k) => (k.value === 'fixed' ? { ...k, label: `Only ${keyName}` } : k))} value={keyMode} onChange={setKeyMode} />
          <div className="toggles">
            <Toggle checked={autoPlay} onChange={setAutoPlay}>
              Play the chord when you get it right
            </Toggle>
          </div>
        </div>
      </Disclosure>

      <Disclosure label="How to build the chords of any key" quiet storageKey="music.theoryRecipeOpen" className="drill-recipe">
        <ol>
          <li>
            <strong>Write out the scale</strong>, one note per letter: D major is D E F# G A B C#.
          </li>
          <li>
            <strong>Stack every other note</strong> from the chord’s number: the 2nd chord is notes 2, 4, 6 (E G B). Add note 8 (the 1st again) for a 7th chord.
          </li>
          <li>
            <strong>Check the 3rds:</strong> 4 frets is a major 3rd, 3 frets a minor 3rd. Major = big then small, minor = small then big, diminished = small + small.
          </li>
          <li>
            <strong>Or just remember the pattern.</strong> Major keys: I ii iii IV V vi vii° (7ths: Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7). Natural minor: i ii° ♭III iv v ♭VI ♭VII.
          </li>
        </ol>
      </Disclosure>
    </div>
  )
}
