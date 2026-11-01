import { useEffect, useReducer, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { playPitch } from '@music/audio.js'
import {
  CHORD_PRESETS,
  PLAY_STYLES,
  QUALITIES,
  ROOT_MODES,
  VOICINGS,
  chordGameReducer,
  chordPitches,
  chordPresetName,
  chordQuizText,
  chordRoundState,
  guitarShape,
  initialChordGame,
  qualityInfo,
  randomChordQuestion,
  toggleQuality,
  type ChordQuestion,
  type Stat,
} from '@music/chordQuiz.js'
import { intervalName, noteToPc, pcName, usesFlats } from '@music/theory.js'
import { useStored } from '@/lib/prefs'
import { colors, space, text } from '@/theme'
import Fretboard from '../Fretboard'
import { oneSection } from '@/lib/choose'
import { Button, ChipRow, ChoiceRow, Disclosure, Group, HeaderButton, Section, SwitchRow } from '../ui'
import { Answers, Feedback, QuizActions, StatBars } from './Answers'
import { TRAINING_SHEET } from './IntervalQuiz'

const ARP_GAP = 0.32
const RING = 2.2
const STATS_KEY = 'music.chordQualityStats'

/** Plays a chord question as an arpeggio, a strum or both, and stops it again. */
function useChordSound() {
  const [playing, setPlaying] = useState(false)
  const sound = useRef<{ timers: ReturnType<typeof setTimeout>[]; stops: (() => void)[] }>({ timers: [], stops: [] })
  const stop = () => {
    sound.current.timers.forEach(clearTimeout)
    sound.current.stops.forEach((s) => s())
    sound.current = { timers: [], stops: [] }
    setPlaying(false)
  }
  const play = (pitches: number[], style: string) => {
    stop()
    const stops: (() => void)[] = []
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
  // Leaving the screen silences it.
  useEffect(
    () => () => {
      sound.current.timers.forEach(clearTimeout)
      sound.current.stops.forEach((s) => s())
    },
    [],
  )
  return { playing, play, stop }
}

/** "Name the chord": hear a chord, pick its quality (major, minor, diminished…), then compare it with the others. */
export default function ChordQuiz({ tuning, stringName, keyName }: { tuning: number[]; stringName: (s: number) => string; keyName: string }) {
  const [enabled, setEnabled] = useStored('music.chordQualities', CHORD_PRESETS[0].qualities)
  const [style, setStyle] = useStored<string>('music.chordStyle', 'both')
  const [voicing, setVoicing] = useStored<string>('music.chordVoicing', 'close')
  const [rootMode, setRootMode] = useStored<string>('music.chordRoot', 'fixed')
  const [inversions, setInversions] = useStored('music.chordInversions', false)
  const [autoPlay, setAutoPlay] = useStored('music.chordAutoPlay', true)
  const [savedStats, saveStats] = useStored<Record<string, Stat>>(STATS_KEY, {})
  const qualities = QUALITIES.filter((q) => enabled.includes(q.id))
  const ids = qualities.length ? qualities.map((q) => q.id) : CHORD_PRESETS[0].qualities
  const keyPc = noteToPc(keyName)
  const options = { rootMode, keyPc, inversions }
  const [game, dispatch] = useReducer(chordGameReducer, null, () => initialChordGame(randomChordQuestion(ids, options), savedStats))
  const { playing, play: playPitches, stop } = useChordSound()

  const { question, guesses, score, stats } = game
  const state = chordRoundState(game)
  const done = state === 'solved' || state === 'revealed'
  useEffect(() => saveStats(stats), [stats, saveStats])

  const play = (q: ChordQuestion | null = question, quality = q?.quality) => {
    if (!q) return
    playPitches(chordPitches(q, { voicing, tuning, quality }), style)
  }
  const next = (withSound = autoPlay) => {
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
    next(false)
  })

  const answer = (id: string) => {
    if (!question) return
    // Once it's known, every answer button plays that quality on the same root, for comparing.
    if (done) return play(question, id)
    if (guesses.includes(id)) return
    dispatch({ type: 'guess', quality: id })
    // Right: hear it again with the answer on screen. Wrong: stay quiet so it can't be mistaken for a new chord.
    if (id === question.quality) play(question)
  }

  const info = question ? qualityInfo(question.quality) : null
  const rootName = question ? pcName(question.rootPc, usesFlats(keyName)) : ''
  const { feedback, compare } = chordQuizText(game, rootName)
  const wrong = guesses.filter((g) => g !== question?.quality)
  const shape = done && question ? guitarShape(question.rootPc, question.quality, tuning) : []
  const presetName = chordPresetName(ids)
  const summary = [presetName ?? qualities.map((q) => q.short).join(' '), ROOT_MODES.find((r) => r.value === rootMode)?.label, PLAY_STYLES.find((s) => s.value === style)?.label].join(' · ')

  return (
    <View style={styles.wrap}>
      <Section title="Name the chord" right={<Text style={styles.score}>Score {score.right}/{score.tries}</Text>}>
        <ChipRow label="Chords to practise" options={CHORD_PRESETS.map((p) => ({ value: p.label, label: p.label }))} value={presetName ?? null} onChange={(_, chip) => setEnabled(CHORD_PRESETS.find((p) => p.label === chip.value)?.qualities ?? enabled)} />
      </Section>

      <View style={styles.listen}>
        <Button primary title={playing ? 'Stop' : done ? 'Replay' : 'Play'} onPress={() => (playing ? stop() : play())} style={styles.play} />
        <Text style={styles.prompt}>
          {rootMode === 'fixed' ? (
            <>
              Root: <Text style={styles.strong}>{rootName}</Text>. What quality is this chord?
            </>
          ) : (
            'What quality is this chord?'
          )}
        </Text>
      </View>

      <Feedback state={state} missed={wrong.length > 0} text={feedback} compare={compare} />

      <Answers
        label={done ? `Hear each chord on ${rootName}` : 'Your answer'}
        answers={qualities.map((q) => ({
          value: q.id,
          label: done ? `🔊 ${q.short}` : q.short,
          sub: done ? `${rootName}${q.symbol}` : q.name !== q.short ? q.name : undefined,
          mark: done && q.id === question?.quality ? 'correct' : guesses.includes(q.id) ? 'wrong' : null,
          disabled: !done && guesses.includes(q.id),
          a11y: done ? `Hear ${q.name} on ${rootName}` : q.name,
        }))}
        onAnswer={answer}
      />

      <QuizActions done={done} onReveal={() => {
          dispatch({ type: 'reveal' })
          play(question)
        }} onNext={() => next()} nextLabel="Next chord" />

      {shape.length > 0 && info ? (
        <Section title={`Play ${rootName}${info.symbol} on guitar`}>
          <Fretboard tuning={tuning} intervals={info.intervals} notes={shape.map((n) => ({ ...n, level: 'shape' as const }))} label={(n) => intervalName(n.interval ?? 0, info.intervals)} stringName={stringName} onNotePress={(n) => playPitch(tuning[n.string] + n.fret)} />
        </Section>
      ) : null}

      <Disclosure title="Settings" summary={summary}>
        <Text style={styles.label}>Or pick chords one by one</Text>
        <ChipRow label="Chord qualities" options={QUALITIES.map((q) => ({ value: q.id, label: q.short, on: enabled.includes(q.id), a11y: q.name }))} onChange={(id: string) => setEnabled(toggleQuality(enabled, id) ?? enabled)} wrap />
        <Group>
          <ChoiceRow label="Played as" value={style} sections={oneSection([...PLAY_STYLES])} onChange={setStyle} sheet={TRAINING_SHEET} first />
          <ChoiceRow label="Root" value={rootMode} sections={oneSection([...ROOT_MODES])} onChange={setRootMode} sheet={TRAINING_SHEET} />
          <ChoiceRow label="Voicing" value={voicing} sections={oneSection([...VOICINGS])} onChange={setVoicing} sheet={TRAINING_SHEET} />
          <SwitchRow label="Inversions (another chord note in the bass)" value={inversions} onChange={setInversions} disabled={voicing === 'guitar'} />
          <SwitchRow label="Auto-play next" value={autoPlay} onChange={setAutoPlay} last />
        </Group>
      </Disclosure>

      <Disclosure title="What each chord sounds like">
        {qualities.map((q) => (
          <View key={q.id} style={styles.guide}>
            <HeaderButton ios="speaker.wave.2" android="volume_up" label={`Hear ${q.name}`} onPress={() => play(question, q.id)} />
            <Text style={styles.guideText}>
              <Text style={styles.strong}>{q.name}</Text> {q.feel} <Text style={styles.muted}>{q.listen}</Text>
            </Text>
          </View>
        ))}
      </Disclosure>

      {qualities.some((q) => stats[q.id]?.tries) ? (
        <Disclosure title="Accuracy by chord">
          <StatBars rows={qualities.map((q) => ({ id: q.id, label: q.short, stat: stats[q.id] ?? { right: 0, tries: 0 } }))} onReset={() => dispatch({ type: 'resetStats' })} />
        </Disclosure>
      ) : null}
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
  muted: { color: colors.muted },
  label: { color: colors.muted, fontSize: text.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: space[4] },
  guide: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], paddingHorizontal: space[4] },
  guideText: { flex: 1, color: colors.text, fontSize: text.sm, lineHeight: 20 },
})
