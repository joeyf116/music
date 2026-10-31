import { useEffect, useReducer, useRef, useState } from 'react'
import { playPitch } from '../lib/audio.js'
import { CHORD_PRESETS, PLAY_STYLES, QUALITIES, ROOT_MODES, VOICINGS, chordGameReducer, chordPitches, chordRoundState, guitarShape, initialChordGame, qualityInfo, randomChordQuestion } from '../lib/chordQuiz.js'
import { intervalName, noteToPc, pcName, usesFlats } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Choice, Toggle } from './controls.jsx'
import Fretboard from './Fretboard.jsx'
import { Disclosure } from './layout.jsx'

const ANSWER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-']
const STATS_KEY = 'music.chordQualityStats'
const ARP_GAP = 0.32
const RING = 2.2
const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)
const withArticle = (name) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`

const loadStats = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STATS_KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

/** "Name the chord": hear a chord, pick its quality (major, minor, diminished…), then compare it with the others. */
export default function ChordQuiz({ tuning, stringName, keyName }) {
  const [enabled, setEnabled] = usePersistentState('music.chordQualities', CHORD_PRESETS[0].qualities)
  const [style, setStyle] = usePersistentState('music.chordStyle', 'both')
  const [voicing, setVoicing] = usePersistentState('music.chordVoicing', 'close')
  const [rootMode, setRootMode] = usePersistentState('music.chordRoot', 'fixed')
  const [inversions, setInversions] = usePersistentState('music.chordInversions', false)
  const [autoPlay, setAutoPlay] = usePersistentState('music.chordAutoPlay', true)
  const [settingsOpen, setSettingsOpen] = usePersistentState('music.chordSettingsOpen', false)
  const qualities = QUALITIES.filter((q) => enabled.includes(q.id))
  const ids = qualities.length ? qualities.map((q) => q.id) : CHORD_PRESETS[0].qualities
  const keyPc = noteToPc(keyName)
  const options = { rootMode, keyPc, inversions }
  const [game, dispatch] = useReducer(chordGameReducer, null, () => initialChordGame(randomChordQuestion(ids, options), loadStats()))
  const [playing, setPlaying] = useState(false)
  const sound = useRef({ timers: [], stops: [] })
  const nextButton = useRef(null)

  const { question, guesses, score, stats } = game
  const state = chordRoundState(game)
  const done = state === 'solved' || state === 'revealed'
  useEffect(() => {
    try {
      window.localStorage.setItem(STATS_KEY, JSON.stringify(stats))
    } catch {
      // No storage: stats last until the page closes.
    }
  }, [stats])

  const stop = () => {
    sound.current.timers.forEach(clearTimeout)
    sound.current.stops.forEach((s) => s())
    sound.current = { timers: [], stops: [] }
    setPlaying(false)
  }

  // Arpeggio low to high, a strum, or both (notes first, then together), in the chosen voicing.
  const play = (q = question, quality = q?.quality) => {
    stop()
    if (!q) return
    const pitches = chordPitches(q, { voicing, tuning, quality })
    const stops = []
    let end = 0
    if (style !== 'block') {
      pitches.forEach((p, i) => stops.push(playPitch(p, i * ARP_GAP, 1.2, 0.16)))
      end = pitches.length * ARP_GAP + (style === 'arpeggio' ? 0.9 : 0.25)
    }
    if (style !== 'arpeggio') {
      const start = style === 'both' ? end : 0
      pitches.forEach((p, i) => stops.push(playPitch(p, start + i * 0.03, RING, 0.11)))
      end = start + RING
    }
    sound.current = { stops, timers: [setTimeout(() => setPlaying(false), end * 1000)] }
    setPlaying(true)
  }
  const togglePlay = () => (playing ? stop() : play())

  const next = ({ sound: withSound = autoPlay } = {}) => {
    const q = randomChordQuestion(ids, { ...options, previous: question })
    dispatch({ type: 'next', question: q })
    if (withSound) play(q)
    else stop()
  }

  // Changing what's being practised starts a fresh question, quietly.
  const settingsKey = `${ids.join(',')}|${rootMode}|${keyPc}|${inversions}`
  const lastSettings = useRef(settingsKey)
  useEffect(() => {
    if (lastSettings.current === settingsKey) return
    lastSettings.current = settingsKey
    next({ sound: false })
  })
  useEffect(() => stop, [])
  useEffect(() => {
    if (done) nextButton.current?.focus({ preventScroll: true })
  }, [done])

  const answer = (id) => {
    if (!question) return
    // Once it's known, every answer button plays that quality on the same root, for comparing.
    if (done) return play(question, id)
    if (guesses.includes(id)) return
    dispatch({ type: 'guess', quality: id })
    // Right: hear it again with the answer on screen. Wrong: stay quiet so it can't be mistaken for a new chord.
    if (id === question.quality) play(question)
  }
  const reveal = () => {
    dispatch({ type: 'reveal' })
    play(question)
  }
  const toggleQuality = (id) => {
    const list = enabled.includes(id) ? enabled.filter((q) => q !== id) : QUALITIES.map((q) => q.id).filter((q) => q === id || enabled.includes(q))
    if (list.length >= 2) setEnabled(list)
  }

  const keyRef = useRef(null)
  useEffect(() => {
    keyRef.current = (e) => {
      if (isTyping(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey) return
      const onButton = document.activeElement?.tagName === 'BUTTON'
      const index = ANSWER_KEYS.indexOf(e.key)
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else if (index >= 0 && qualities[index]) {
        answer(qualities[index].id)
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

  const info = question && qualityInfo(question.quality)
  const flats = usesFlats(keyName)
  const rootName = question ? pcName(question.rootPc, flats) : ''
  const wrong = guesses.filter((g) => g !== question?.quality)
  const feedback = (() => {
    if (!question) return ''
    if (state === 'solved') return `${wrong.length ? 'Got it.' : 'Correct!'} ${rootName}${info.symbol} is ${withArticle(info.name.toLowerCase())} chord: ${info.feel.toLowerCase()}`
    if (state === 'revealed') return `It was ${rootName}${info.symbol}, ${withArticle(info.name.toLowerCase())} chord: ${info.feel.toLowerCase()}`
    if (wrong.length) return `Not ${qualityInfo(wrong[wrong.length - 1]).name.toLowerCase()}. Press Play to hear it again.`
    return 'Press Play, listen to the colour of the chord, then name it.'
  })()
  const compareHint = done ? `Tap any answer to hear it on ${rootName}${wrong.length ? `, e.g. ${qualityInfo(wrong[0]).short} next to ${info.short}` : ''}. ${info.listen}` : ''

  const shape = done && question ? guitarShape(question.rootPc, question.quality, tuning) : []
  const presetName = CHORD_PRESETS.find((p) => p.qualities.join() === ids.join())?.label
  const summary = [presetName ?? qualities.map((q) => q.short).join(' '), ROOT_MODES.find((r) => r.value === rootMode)?.label, PLAY_STYLES.find((s) => s.value === style)?.label].join(' · ')
  const statRows = qualities.map((q) => ({ ...q, ...(stats[q.id] ?? { right: 0, tries: 0 }) }))

  return (
    <div className="quiz chord-quiz">
      <div className="section-head">
        <h2>Name the chord</h2>
        <span className="quiz-score" aria-live="polite">
          Score {score.right}/{score.tries}
        </span>
      </div>

      <div className="field quiz-setup">
        <span className="field-label" id="chord-presets">Chords to practise</span>
        <div className="presets" role="group" aria-labelledby="chord-presets">
          {CHORD_PRESETS.map((p) => (
            <button key={p.id} type="button" className={p.label === presetName ? 'on' : ''} aria-pressed={p.label === presetName} onClick={() => setEnabled(p.qualities)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-listen">
        <button type="button" className="primary play-button" onClick={togglePlay} aria-pressed={playing}>
          {playing ? '■ Stop' : done ? '▶ Replay' : '▶ Play'}
        </button>
        <p className="quiz-prompt">
          {rootMode === 'fixed' ? (
            <>
              Root: <strong>{rootName}</strong>. What quality is this chord?
            </>
          ) : (
            'What quality is this chord?'
          )}
        </p>
      </div>

      <p className={`quiz-feedback ${state}${wrong.length && !done ? ' missed' : ''}`} aria-live="polite">
        {feedback}
        {compareHint && <small>{compareHint}</small>}
      </p>

      <div className={`interval-answers chord-answers${done ? ' comparing' : ''}`} role="group" aria-label={done ? `Hear each chord on ${rootName}` : 'Your answer'}>
        {qualities.map((q, index) => {
          const mark = done && q.id === question.quality ? 'correct' : guesses.includes(q.id) ? 'wrong' : ''
          return (
            <button key={q.id} type="button" className={`answer ${mark}`} onClick={() => answer(q.id)} disabled={!done && mark === 'wrong'} aria-label={done ? `Hear ${q.name} on ${rootName}` : q.name}>
              {ANSWER_KEYS[index] && <kbd>{ANSWER_KEYS[index]}</kbd>}
              <strong>
                {done && <span aria-hidden="true">🔊 </span>}
                {q.short}
              </strong>
              {(done || q.name !== q.short) && <small>{done ? `${rootName}${q.symbol}` : q.name}</small>}
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
            Next chord →
          </button>
        )}
      </div>
      <p className="hint keys-hint">Keys: Space play/stop · 1–{Math.min(qualities.length, 9)} answer · Enter or N next.</p>

      <Disclosure label="Settings" summary={summary} open={settingsOpen} onToggle={setSettingsOpen} className="quiz-settings-panel">
        <div className="interval-picker">
          <span className="field-label">Or pick chords one by one</span>
          <div className="interval-toggles" role="group" aria-label="Chord qualities">
            {QUALITIES.map((q) => (
              <button key={q.id} type="button" className={enabled.includes(q.id) ? 'on' : ''} aria-pressed={enabled.includes(q.id)} title={q.name} onClick={() => toggleQuality(q.id)}>
                {q.short}
              </button>
            ))}
          </div>
        </div>
        <div className="field-grid quiz-settings">
          <Choice label="Played as" options={PLAY_STYLES} value={style} onChange={setStyle} />
          <Choice label="Root" options={ROOT_MODES} value={rootMode} onChange={setRootMode} />
          <Choice label="Voicing" options={VOICINGS} value={voicing} onChange={setVoicing} />
          <div className="toggles">
            <Toggle checked={inversions} onChange={setInversions} disabled={voicing === 'guitar'}>
              Inversions (another chord note in the bass)
            </Toggle>
            <Toggle checked={autoPlay} onChange={setAutoPlay}>
              Auto-play next
            </Toggle>
          </div>
        </div>
      </Disclosure>

      {shape.length > 0 && (
        <div className="chord-shape">
          <h3>
            Play {rootName}
            {info.symbol} on guitar
          </h3>
          <Fretboard
            tuning={tuning}
            intervals={info.intervals}
            notes={shape.map((n) => ({ ...n, level: 'shape' }))}
            label={(n) => intervalName(n.interval, info.intervals)}
            stringName={stringName}
            onNoteClick={(n) => playPitch(n.pitch)}
          />
        </div>
      )}

      <Disclosure label="What each chord sounds like" quiet className="quiz-stats listening-guide">
        <ul className="quality-guide">
          {qualities.map((q) => (
            <li key={q.id}>
              <button type="button" onClick={() => play(question, q.id)} aria-label={`Hear ${q.name}`}>
                🔊
              </button>
              <span>
                <strong>{q.name}</strong> {q.feel} <small>{q.listen}</small>
              </span>
            </li>
          ))}
        </ul>
      </Disclosure>

      {statRows.some((r) => r.tries) && (
        <Disclosure label="Accuracy by chord" className="quiz-stats">
          <ul>
            {statRows.map((r) => (
              <li key={r.id}>
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
    </div>
  )
}
