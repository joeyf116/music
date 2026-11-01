import { Pressable, StyleSheet, Text, View } from 'react-native'
import { tapPosition, tapVerdict } from '@music/rhythmView.js'
import type { TapResult } from '@music/rhythm.js'
import { impact } from '@/lib/haptics'
import { isMiss, type TapJudge } from '@/lib/useTapJudge'
import { colors, space, text } from '@/theme'
import { TextButton } from '../ui'

const GRADE_COLOR = { perfect: colors.good, good: colors.accent, off: colors.root } as const

/** The big pad you tap in time. It judges the moment the finger lands (not when it lifts). */
export default function TapPad({ judge, disabled, idle, label = 'Tap pad' }: { judge: TapJudge; disabled: boolean; idle: string; label?: string }) {
  const { last } = judge
  const tone = !last ? null : isMiss(last) ? 'off' : last.grade
  const verdict = tapVerdict(last && !isMiss(last) ? last : last ? { miss: true } : null, idle)
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        judge.tap()
        impact()
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={verdict}
      style={({ pressed }) => [styles.pad, tone && { borderColor: GRADE_COLOR[tone] }, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.text, tone && { color: GRADE_COLOR[tone] }]} accessibilityLiveRegion="polite">
        {verdict}
      </Text>
      {last && !isMiss(last) ? <TapMeter ms={last.ms} /> : null}
    </Pressable>
  )
}

/** Where one tap landed: a dot on an early ← → late scale (±100 ms). */
function TapMeter({ ms }: { ms: number }) {
  return (
    <View style={styles.meter}>
      <View style={styles.zone} />
      <View style={[styles.dot, { left: `${tapPosition(ms)}%` }]} />
      <View style={styles.meterLabels}>
        <Text style={styles.small}>early</Text>
        <Text style={styles.small}>late</Text>
      </View>
    </View>
  )
}

/** Summary of a run of taps: every tap as a dot (early left, late right), plus averages in words. */
export function TapResults({ judge }: { judge: TapJudge }) {
  const { results, summary } = judge
  if (!results.length) return null
  const judged = results.filter((r): r is TapResult => !isMiss(r))
  const stats: [string, string][] = summary
    ? [
        ['Taps', String(summary.count)],
        ['Within 25 ms', `${Math.round((summary.tight / summary.count) * 100)}%`],
        ['Average', `${summary.mean > 0 ? '+' : ''}${summary.mean} ms`],
        ['Spread', `±${summary.spread} ms`],
      ]
    : []
  return (
    <View style={styles.results}>
      <View style={styles.scatter} accessible accessibilityLabel={summary ? summary.verdict : 'No taps landed near a beat yet'}>
        <View style={styles.scatterZone} />
        <View style={styles.center} />
        {judged.map((r, i) => (
          <View key={i} style={[styles.scatterDot, { left: `${tapPosition(r.ms)}%`, backgroundColor: GRADE_COLOR[r.grade], opacity: 0.35 + (0.65 * (i + 1)) / judged.length }]} />
        ))}
        <Text style={[styles.small, styles.left]}>← early</Text>
        <Text style={[styles.small, styles.right]}>late →</Text>
      </View>
      {summary ? (
        <>
          <Text style={styles.verdict}>{summary.verdict}</Text>
          <View style={styles.stats}>
            {stats.map(([name, value]) => (
              <View key={name} style={styles.stat}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.small}>{name}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <TextButton title="Clear taps" onPress={judge.reset} />
    </View>
  )
}

const styles = StyleSheet.create({
  pad: { marginHorizontal: space[4], minHeight: 150, borderRadius: 20, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: space[4], gap: space[3] },
  pressed: { backgroundColor: colors.surface2 },
  disabled: { opacity: 0.5 },
  text: { color: colors.text, fontSize: text.lg, fontWeight: '700', textAlign: 'center' },
  meter: { width: '80%', height: 34 },
  zone: { position: 'absolute', left: '37.5%', width: '25%', top: 6, height: 10, borderRadius: 5, backgroundColor: 'rgba(48, 164, 108, 0.3)' },
  dot: { position: 'absolute', top: 3, width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: colors.accent },
  meterLabels: { position: 'absolute', top: 18, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
  small: { color: colors.muted, fontSize: text.xs },
  results: { marginHorizontal: space[4], gap: space[3], alignItems: 'flex-start' },
  scatter: { alignSelf: 'stretch', height: 56, borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden' },
  scatterZone: { position: 'absolute', left: '37.5%', width: '25%', top: 0, bottom: 0, backgroundColor: 'rgba(48, 164, 108, 0.15)' },
  center: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: colors.borderStrong },
  scatterDot: { position: 'absolute', top: 14, width: 12, height: 12, marginLeft: -6, borderRadius: 6 },
  left: { position: 'absolute', left: 8, bottom: 4 },
  right: { position: 'absolute', right: 8, bottom: 4 },
  verdict: { color: colors.text, fontSize: text.base, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: space[4], flexWrap: 'wrap' },
  stat: { gap: 2 },
  statValue: { color: colors.text, fontSize: text.lg, fontWeight: '700', fontVariant: ['tabular-nums'] },
})
