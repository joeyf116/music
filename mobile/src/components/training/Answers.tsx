import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Stat } from '@music/chordQuiz.js'
import { selection } from '@/lib/haptics'
import { colors, space, text, touch } from '@/theme'
import { Button, Notice, TextButton } from '../ui'

export type Mark = 'correct' | 'wrong' | null

export interface Answer<V> {
  value: V
  label: string
  sub?: string
  mark?: Mark
  disabled?: boolean
  a11y?: string
}

/** Answer buttons in a grid (two or three to a row), marked right or wrong as the player guesses. */
export function Answers<V extends string | number>({ answers, onAnswer, label, columns = 3 }: { answers: Answer<V>[]; onAnswer: (value: V) => void; label: string; columns?: 2 | 3 | 4 }) {
  return (
    <View style={styles.grid} accessibilityLabel={label}>
      {answers.map((a) => (
        <Pressable
          key={String(a.value)}
          disabled={a.disabled}
          onPress={() => {
            selection()
            onAnswer(a.value)
          }}
          accessibilityRole="button"
          accessibilityLabel={a.a11y ?? (a.sub ? `${a.label} (${a.sub})` : a.label)}
          accessibilityState={{ disabled: a.disabled, selected: a.mark === 'correct' }}
          style={({ pressed }) => [styles.answer, { width: `${100 / columns}%` }, pressed && styles.pressed]}
        >
          <View style={[styles.tile, a.mark === 'correct' && styles.correct, a.mark === 'wrong' && styles.wrong]}>
            <Text style={[styles.label, a.mark === 'correct' && styles.correctText, a.mark === 'wrong' && styles.wrongText]}>{a.label}</Text>
            {a.sub ? <Text style={[styles.sub, a.mark === 'correct' && styles.correctText]}>{a.sub}</Text> : null}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

/** The result line under a question, coloured by how it went. */
export function Feedback({ state, missed, text: message, compare }: { state: string; missed: boolean; text: string; compare?: string }) {
  return (
    <View style={[styles.feedback, state === 'solved' && styles.feedbackGood, state === 'revealed' && styles.feedbackShown, missed && state === 'asking' && styles.feedbackMissed]}>
      <Notice>{message}</Notice>
      {compare ? <Text style={styles.compare}>{compare}</Text> : null}
    </View>
  )
}

/** Show answer / Skip while asking, Next once the question is over. */
export function QuizActions({ done, onReveal, onNext, nextLabel, extra }: { done: boolean; onReveal: () => void; onNext: () => void; nextLabel: string; extra?: ReactNode }) {
  return (
    <View style={styles.actions}>
      {done ? (
        <>
          <Button primary title={nextLabel} onPress={onNext} style={styles.next} />
          {extra}
        </>
      ) : (
        <>
          <Button title="Show answer" onPress={onReveal} style={styles.flex} />
          <Button title="Skip" onPress={onNext} style={styles.flex} />
        </>
      )}
    </View>
  )
}

/** Accuracy per answer as bars, with a reset. */
export function StatBars({ rows, onReset }: { rows: { id: string; label: string; stat: Stat }[]; onReset: () => void }) {
  return (
    <View style={styles.stats}>
      {rows.map((r) => {
        const pct = r.stat.tries ? r.stat.right / r.stat.tries : 0
        return (
          <View key={r.id} style={styles.statRow} accessible accessibilityLabel={`${r.label}: ${r.stat.tries ? `${Math.round(pct * 100)}% of ${r.stat.tries}` : 'not yet'}`}>
            <Text style={styles.statName}>{r.label}</Text>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
            </View>
            <Text style={styles.statValue}>{r.stat.tries ? `${Math.round(pct * 100)}% of ${r.stat.tries}` : 'not yet'}</Text>
          </View>
        )
      })}
      <TextButton title="Reset stats" onPress={onReset} danger />
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space[3] },
  answer: { padding: space[1] },
  pressed: { opacity: 0.7 },
  tile: { minHeight: touch + 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: space[2] },
  correct: { backgroundColor: colors.good, borderColor: colors.good },
  wrong: { borderColor: colors.root, opacity: 0.6 },
  label: { color: colors.text, fontSize: text.lg, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: text.xs, marginTop: 2, textAlign: 'center' },
  correctText: { color: '#0d1a12' },
  wrongText: { color: colors.root, textDecorationLine: 'line-through' },
  feedback: { marginHorizontal: space[4], paddingVertical: space[2], borderLeftWidth: 4, borderLeftColor: colors.borderStrong, gap: space[1] },
  feedbackGood: { borderLeftColor: colors.good },
  feedbackShown: { borderLeftColor: colors.accent },
  feedbackMissed: { borderLeftColor: colors.root },
  compare: { color: colors.muted, fontSize: text.sm, lineHeight: 20, paddingHorizontal: space[4] },
  actions: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], flexWrap: 'wrap' },
  next: { flex: 2, minHeight: 52 },
  flex: { flex: 1 },
  stats: { paddingHorizontal: space[4], gap: space[2], alignItems: 'flex-start' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], alignSelf: 'stretch' },
  statName: { color: colors.text, fontSize: text.sm, fontWeight: '600', width: 52 },
  bar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.good },
  statValue: { color: colors.muted, fontSize: text.xs, width: 76, textAlign: 'right' },
})
