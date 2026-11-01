import { useEffect, useReducer, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { playPitch } from '@music/audio.js'
import type { NeckNote } from '@music/fretboardView.js'
import type { Stat } from '@music/chordQuiz.js'
import {
  DIRECTIONS,
  DIRECTION_TEXT,
  FRET_RANGES,
  INTERVALS,
  PRESETS,
  answerLabel,
  gameReducer,
  initialGame,
  intervalPresetName,
  intervalQuizText,
  intervalWithArticle,
  pitchesOf,
  randomQuestion,
  roundState,
  stringOrdinal,
  toggleInterval,
  type Direction,
  type IntervalQuestion,
} from '@music/intervalQuiz.js'
import { pcName } from '@music/theory.js'
import { PICKERS } from '@/lib/pickers'
import { useMusic } from '@/lib/music'
import { useStored } from '@/lib/prefs'
import { colors, space, text } from '@/theme'
import Fretboard from '../Fretboard'
import { Button, ChipRow, ChoiceRow, Disclosure, Group, Notice, Section, Segmented, SwitchRow } from '../ui'
import { Answers, Feedback, QuizActions, StatBars } from './Answers'

export const TRAINING_SHEET = '/training/choose'
// Seconds between the two notes, how long each rings, and the pause before a loop repeats.
const GAP = 0.9
const RING = 1.4
const LOOP_PAUSE = 0.8
const DIRECTION_OPTIONS = DIRECTIONS.map((d) => ({ value: d.id, label: d.label }))
const RANGE_OPTIONS = FRET_RANGES.map((r) => ({ value: String(r.maxFret), label: r.label.replace('Frets ', '') }))

/** "Guess the interval": the root is shown on the neck, the two notes are played, name the gap by ear. */
export default function IntervalQuiz() {
  const { tuning, tuningId, setTuningId, stringName } = useMusic()
  const [maxFret, setMaxFret] = useStored('music.intervalFrets', 12)
  const [enabled, setEnabled] = useStored('music.intervals', PRESETS[0].semitones)
  const [direction, setDirection] = useStored<Direction>('music.intervalDirection', 'up')
  const [loop, setLoop] = useStored('music.intervalLoop', false)
  const [autoPlay, setAutoPlay] = useStored('music.intervalAutoPlay', true)
  const [savedStats, saveStats] = useStored<Record<string, Stat>>('music.intervalStats', {})
  const [savedBest, saveBest] = useStored('music.intervalBest', 0)
  const choices = INTERVALS.filter((i) => enabled.includes(i.semitones))
  const semitones = choices.length ? choices.map((i) => i.semitones) : PRESETS[0].semitones
  const [game, dispatch] = useReducer(gameReducer, null, () => initialGame(randomQuestion(tuning, maxFret, semitones, direction), { stats: savedStats, best: savedBest }))
  const [playing, setPlaying] = useState(false)
  const sound = useRef<{ timers: ReturnType<typeof setTimeout>[]; stops: (() => void)[] }>({ timers: [], stops: [] })

  const { question, guesses, score, streak, best, stats } = game
  const state = roundState(game)
  const done = state === 'solved' || state === 'revealed'
  useEffect(() => saveStats(stats), [stats, saveStats])
  useEffect(() => saveBest(best), [best, saveBest])
  useEffect(
    () => () => {
      sound.current.timers.forEach(clearTimeout)
      sound.current.stops.forEach((s) => s())
    },
    [],
  )

  const stop = () => {
    sound.current.timers.forEach(clearTimeout)
    sound.current.stops.forEach((s) => s())
    sound.current = { timers: [], stops: [] }
    setPlaying(false)
  }

  // Plays root then second note (or both at once), repeating until stopped when `repeat` is on.
  // `size` plays a different interval from the same root, for comparing after an answer.
  const play = (q: IntervalQuestion | null = question, { repeat = loop, size = q?.semitones ?? 0 } = {}) => {
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

  const next = (withSound = autoPlay) => {
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
    next(false)
  })

  const answer = (size: number) => {
    if (!question) return
    // After the answer is known, every button plays that interval from the same root for comparison.
    if (done) return play(question, { repeat: false, size })
    if (guesses.includes(size)) return
    dispatch({ type: 'guess', size })
    if (size === question.semitones) play(question, { repeat: false })
  }

  const wrong = guesses.filter((g) => g !== question?.semitones)
  const { feedback, compare } = intervalQuizText(game)
  const notes: NeckNote[] = []
  if (question) {
    notes.push({ ...question.root, role: 'root', level: playing ? 'active' : 'shape' })
    if (done) notes.push({ ...question.target, role: 'fifth', level: 'shape' })
  }
  const presetName = intervalPresetName(semitones)
  const settingsSummary = [DIRECTIONS.find((d) => d.id === direction)?.label, presetName ?? choices.map((i) => i.short).join(' '), FRET_RANGES.find((r) => r.maxFret === maxFret)?.label].join(' · ')
  const tuningSections = PICKERS.tuning.sections().map((sec) => ({ title: sec.title ?? undefined, options: sec.options }))

  return (
    <View style={styles.wrap}>
      <Section
        title="Guess the interval"
        right={
          <Text style={styles.score}>
            {score.right}/{score.tries} · Streak {streak} · Best {best}
          </Text>
        }
      >
        <ChipRow label="Intervals to practise" options={PRESETS.map((p) => ({ value: p.label, label: p.label }))} value={presetName ?? null} onChange={(label: string) => setEnabled(PRESETS.find((p) => p.label === label)?.semitones ?? enabled)} />
      </Section>

      {question ? (
        <>
          <View style={styles.listen}>
            <Button primary title={playing ? 'Stop' : done ? 'Replay' : 'Play'} onPress={() => (playing ? stop() : play())} style={styles.play} />
            <Text style={styles.prompt}>
              The root is <Text style={styles.strong}>{pcName(pitchesOf(question, tuning)[0])}</Text> on the {stringOrdinal(question.root.string, tuning.length)}. Name the interval {DIRECTION_TEXT[question.direction]}.
            </Text>
          </View>
          <Fretboard tuning={tuning} notes={notes} label={(n) => (n.role === 'root' ? pcName(tuning[n.string] + n.fret) : answerLabel(question))} stringName={stringName} onNotePress={(n) => playPitch(tuning[n.string] + n.fret)} frets={maxFret} />
          <Feedback state={state} missed={wrong.length > 0} text={feedback} compare={compare} />
          <Answers
            label={done ? 'Hear an interval from this root' : 'Your answer'}
            columns={4}
            answers={choices.map((i) => ({
              value: i.semitones,
              label: done ? `🔊 ${i.short}` : i.short,
              sub: i.name,
              mark: done && i.semitones === question.semitones ? 'correct' : guesses.includes(i.semitones) ? 'wrong' : null,
              disabled: !done && guesses.includes(i.semitones),
              a11y: done ? `Hear ${intervalWithArticle(i.name)}` : i.name,
            }))}
            onAnswer={answer}
          />
          <QuizActions
            done={done}
            onReveal={() => {
              dispatch({ type: 'reveal' })
              play(question, { repeat: false })
            }}
            onNext={() => next()}
            nextLabel="Next interval"
          />
          {choices.some((i) => stats[i.semitones]?.tries) ? (
            <Disclosure title="Accuracy by interval">
              <StatBars rows={choices.map((i) => ({ id: String(i.semitones), label: i.short, stat: stats[i.semitones] ?? { right: 0, tries: 0 } }))} onReset={() => dispatch({ type: 'resetStats' })} />
            </Disclosure>
          ) : null}
        </>
      ) : (
        <Notice>None of these intervals fit in this fret range. Try a wider range.</Notice>
      )}

      <Disclosure title="Settings" summary={settingsSummary}>
        <Text style={styles.label}>Direction</Text>
        <Segmented options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
        <Text style={styles.label}>Frets</Text>
        <Segmented options={RANGE_OPTIONS} value={String(maxFret)} onChange={(v) => setMaxFret(Number(v))} />
        <Group>
          <ChoiceRow label="Tuning" value={tuningId} sections={tuningSections} onChange={setTuningId} sheet={TRAINING_SHEET} first />
          <SwitchRow label="Loop until stopped" value={loop} onChange={setLoop} />
          <SwitchRow label="Auto-play next" value={autoPlay} onChange={setAutoPlay} last />
        </Group>
        <Text style={styles.label}>Or pick intervals one by one</Text>
        <ChipRow label="Intervals to practise" options={INTERVALS.map((i) => ({ value: i.semitones, label: i.short, on: enabled.includes(i.semitones), a11y: i.name }))} onChange={(size: number) => setEnabled(toggleInterval(enabled, size) ?? enabled)} wrap />
      </Disclosure>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  score: { color: colors.muted, fontSize: text.sm, fontVariant: ['tabular-nums'] },
  listen: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] },
  play: { minWidth: 110, minHeight: 52 },
  prompt: { flex: 1, color: colors.text, fontSize: text.base, lineHeight: 22 },
  strong: { fontWeight: '700' },
  label: { color: colors.muted, fontSize: text.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: space[4] },
})
