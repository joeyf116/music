import { useEffect, useReducer, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { playChord } from '@music/audio.js'
import {
  CHORD_SIZES,
  DRILLS,
  KEY_MODES,
  KEY_SETS,
  THEORY_RECIPE,
  chordFormula,
  chordWorkingText,
  drillChordPitches,
  drillFeedback,
  drillReducer,
  drillState,
  initialDrill,
  keyPatternText,
  pickedIn,
  randomDrillQuestion,
  toneName,
} from '@music/theoryDrill.js'
import { useStored } from '@/lib/prefs'
import { colors, space, text } from '@/theme'
import { oneSection } from '@/lib/choose'
import { Button, ChipRow, ChoiceRow, Disclosure, Group, Section, Segmented, SwitchRow } from '../ui'
import { Answers, Feedback, QuizActions } from './Answers'
import { TRAINING_SHEET } from './IntervalQuiz'

/** "Build chords in a key": stack chords from a scale, name a key's chords, and spell chords from their formula. */
export default function TheoryDrill({ keyName }: { keyName: string }) {
  const [drill, setDrill] = useStored<string>('music.theoryDrill', 'build')
  const [size, setSize] = useStored<string>('music.theorySize', 'triads')
  const [keys, setKeys] = useStored<string>('music.theoryKeys', 'major')
  const [keyMode, setKeyMode] = useStored<string>('music.theoryKeyMode', 'any')
  const [autoPlay, setAutoPlay] = useStored('music.theoryAutoPlay', true)
  const settings = { drill, size, keys, keyMode, keyName }
  const [game, dispatch] = useReducer(drillReducer, null, () => initialDrill(randomDrillQuestion(settings)))

  const { question, score } = game
  const state = drillState(game)
  const done = state === 'solved' || state === 'revealed'
  const step = question.steps[Math.min(game.step, question.steps.length - 1)]
  const { chord } = question
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

  const answer = (id: string | number) => {
    if (done) return
    const solves = game.step === question.steps.length - 1 && game.progress === step.answers.length - 1 && id === step.answers[game.progress]
    dispatch({ type: 'guess', id })
    if (solves && autoPlay) hear()
  }

  const info = question.key
  const building = question.drill === 'build' && game.step === 0 && !done
  const picked = pickedIn(game, 0)
  const pattern = keyPatternText(question)
  const formula = chordFormula(chord.type)
  const keySet = KEY_SETS.find((k) => k.value === keys)
  const summary = [keySet?.label ?? 'Major', keyMode === 'fixed' ? `only ${keyName}` : 'any key', autoPlay ? 'plays when right' : 'silent'].join(' · ')

  return (
    <View style={styles.wrap}>
      <Section title="Build chords in a key" right={<Text style={styles.score}>Score {score.right}/{score.tries}</Text>}>
        <Segmented options={DRILLS} value={drill} onChange={setDrill} />
        <Segmented options={CHORD_SIZES} value={size} onChange={setSize} />
      </Section>

      <Text style={styles.prompt} accessibilityRole="header">
        {question.prompt}
      </Text>

      {question.drill === 'build' && info ? (
        <>
          <Answers
            label={info.title}
            columns={4}
            answers={info.scale.map((name, i) => {
              const at = picked.indexOf(i)
              const wrong = building && game.wrong.includes(i)
              return { value: i, label: name, sub: at >= 0 ? toneName(at) : String(i + 1), mark: at >= 0 ? 'correct' : wrong ? 'wrong' : null, disabled: !building || wrong, a11y: `${name}${at >= 0 ? `, ${toneName(at)}` : ''}` }
            })}
            onAnswer={answer}
          />
          <View style={styles.slots} importantForAccessibility="no-hide-descendants">
            {question.steps[0].answers.map((t, k) => (
              <View key={k} style={[styles.slot, k < picked.length && styles.slotFilled]}>
                <Text style={styles.slotTone}>{toneName(k)}</Text>
                <Text style={styles.slotNote}>{k < picked.length ? info.scale[Number(t)] : '?'}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {choiceIndex <= game.step || done ? (
        <Answers
          label={done ? 'Answer' : (choiceStep.prompt ?? 'Your answer')}
          columns={choiceStep.options.length > 4 ? 4 : 2}
          answers={choiceStep.options.map((o) => {
            const right = pickedIn(game, choiceIndex).includes(o.id)
            const wrong = !done && game.wrong.includes(o.id)
            return { value: o.id, label: o.label, sub: o.sub && o.sub !== o.label ? o.sub : undefined, mark: right ? 'correct' : wrong ? 'wrong' : null, disabled: done || wrong }
          })}
          onAnswer={answer}
        />
      ) : null}

      <Feedback state={state} missed={game.wrong.length > 0} text={drillFeedback(game)} />

      <QuizActions done={done} onReveal={() => dispatch({ type: 'reveal' })} onNext={next} nextLabel="Next question" extra={<Button title={`Hear ${chord.name}`} onPress={hear} style={styles.flex} />} />

      {done ? (
        <Section title={`How ${chord.name} is built`}>
          <View style={styles.formula}>
            {chord.notes.map((n, i) => (
              <View key={i} style={styles.formulaNote}>
                <Text style={styles.formulaName}>{n}</Text>
                <Text style={styles.formulaDegree}>{formula[i]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.body}>{chordWorkingText(chord)}</Text>
          {pattern && info ? (
            <>
              <Text style={styles.body}>{pattern.stack}</Text>
              <Text style={styles.muted}>{pattern.pattern}</Text>
              <ChipRow
                label={`Chords in ${info.title}`}
                options={info.chords.map((c) => ({ value: c.degree, top: c.numeral, label: c.name, on: c.degree === question.degree, tonic: c.degree === 0, a11y: `${c.numeral}: ${c.name} (play)` }))}
                onChange={(degree: number) => playChord(drillChordPitches(info.chords[degree]))}
              />
            </>
          ) : null}
        </Section>
      ) : null}

      <Disclosure title="Settings" summary={summary}>
        <Group>
          <ChoiceRow label="Keys" value={keys} sections={oneSection([...KEY_SETS])} onChange={setKeys} sheet={TRAINING_SHEET} first />
          <ChoiceRow label="Key" value={keyMode} sections={oneSection(KEY_MODES.map((k) => (k.value === 'fixed' ? { ...k, label: `Only ${keyName}` } : k)))} onChange={setKeyMode} sheet={TRAINING_SHEET} />
          <SwitchRow label="Play the chord when you get it right" value={autoPlay} onChange={setAutoPlay} last />
        </Group>
      </Disclosure>

      <Disclosure title="How to build the chords of any key">
        {THEORY_RECIPE.map(([lead, rest], i) => (
          <Text key={lead} style={styles.body}>
            {i + 1}. <Text style={styles.strong}>{lead}</Text>
            {rest}
          </Text>
        ))}
      </Disclosure>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  score: { color: colors.muted, fontSize: text.sm, fontVariant: ['tabular-nums'] },
  prompt: { color: colors.text, fontSize: text.xl, fontWeight: '700', paddingHorizontal: space[4] },
  slots: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4] },
  slot: { minWidth: 56, alignItems: 'center', paddingVertical: space[1], borderRadius: 8, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  slotFilled: { borderStyle: 'solid', borderColor: colors.good },
  slotTone: { color: colors.muted, fontSize: 11 },
  slotNote: { color: colors.text, fontSize: text.lg, fontWeight: '700' },
  flex: { flex: 1 },
  formula: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4] },
  formulaNote: { minWidth: 48, alignItems: 'center', padding: space[2], borderRadius: 10, backgroundColor: colors.surface },
  formulaName: { color: colors.text, fontSize: text.lg, fontWeight: '700' },
  formulaDegree: { color: colors.muted, fontSize: text.xs },
  body: { color: colors.text, fontSize: text.base, lineHeight: 22, paddingHorizontal: space[4] },
  muted: { color: colors.muted, fontSize: text.sm, paddingHorizontal: space[4] },
  strong: { fontWeight: '700' },
})
