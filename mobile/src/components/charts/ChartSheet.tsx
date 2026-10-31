import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Chart } from '@music/chart.js'
import { BARS_PER_ROW, barTokens, sectionStarts } from '@music/chartView.js'
import { selection } from '@/lib/haptics'
import { colors, space, text } from '@/theme'

/** A chord symbol set like a lead sheet: root, raised quality, small slash bass. */
export function ChordName({ root, quality, bass, size = text.lg, color = colors.ink }: { root: string; quality: string; bass: string; size?: number; color?: string }) {
  return (
    <Text style={[styles.chord, { fontSize: size, color }]} numberOfLines={1}>
      {root}
      {quality ? <Text style={{ fontSize: size * 0.68 }}>{quality}</Text> : null}
      {bass ? <Text style={{ fontSize: size * 0.72 }}>/{bass}</Text> : null}
    </Text>
  )
}

function BarContent({ text: bar, color }: { text: string; color: string }) {
  return (
    <View style={styles.barContent}>
      {barTokens(bar).map((t, i) =>
        t.kind === 'chord' ? (
          <ChordName key={i} {...t} color={color} />
        ) : (
          <Text key={i} style={[styles.mark, { color }]}>
            {t.kind === 'repeat' ? '𝄎' : t.kind === 'nc' ? 'N.C.' : '/'}
          </Text>
        ),
      )}
    </View>
  )
}

interface ChartSheetProps {
  chart: Chart
  activeBar?: number | null
  startBar?: number
  onBarPress?: (bar: number) => void
}

/** The lead sheet: sections down the page, four bars to a row on paper, the playing bar lit. Same layout as the web's. */
export default function ChartSheet({ chart, activeBar = null, startBar = 0, onBarPress }: ChartSheetProps) {
  const firsts = sectionStarts(chart)
  return (
    <View style={styles.sheet} accessibilityLabel="Chart">
      {chart.sections.map((section, s) => {
        const rows: string[][] = []
        for (let r = 0; r < section.bars.length; r += BARS_PER_ROW) rows.push(section.bars.slice(r, r + BARS_PER_ROW))
        return (
          <View key={s} style={styles.section}>
            {section.label ? (
              <View style={styles.label}>
                <Text style={styles.labelText}>{section.label}</Text>
              </View>
            ) : null}
            {rows.map((row, r) => (
              <View key={r} style={styles.row}>
                {row.map((bar, b) => {
                  const n = firsts[s] + r * BARS_PER_ROW + b
                  const playing = n === activeBar
                  const start = activeBar === null && n === startBar && startBar > 0
                  return (
                    <Pressable
                      key={b}
                      onPress={() => {
                        selection()
                        onBarPress?.(n)
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Bar ${n + 1}${bar ? `: ${bar}` : ''}`}
                      accessibilityState={{ selected: playing }}
                      style={({ pressed }) => [styles.bar, b > 0 && styles.barLine, start && styles.start, playing && styles.playing, pressed && styles.pressed]}
                    >
                      <BarContent text={bar} color={playing ? colors.onAccent : colors.ink} />
                    </Pressable>
                  )
                })}
                {/* Short rows keep the bar width of full ones. */}
                {Array.from({ length: BARS_PER_ROW - row.length }, (_, i) => (
                  <View key={`pad${i}`} style={styles.pad} />
                ))}
              </View>
            ))}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: { marginHorizontal: space[4], padding: space[3], gap: space[3], borderRadius: 12, backgroundColor: colors.paper },
  section: { gap: 0 },
  label: { alignSelf: 'flex-start', marginBottom: space[1], paddingHorizontal: 6, borderWidth: 1.5, borderColor: colors.ink, borderRadius: 3 },
  labelText: { color: colors.ink, fontSize: text.sm, fontWeight: '800' },
  row: { flexDirection: 'row', borderLeftWidth: 2, borderRightWidth: 2, borderColor: colors.ink, minHeight: 48 },
  bar: { flex: 1, justifyContent: 'center', paddingHorizontal: 4 },
  barLine: { borderLeftWidth: 1, borderColor: colors.ink },
  pad: { flex: 1 },
  start: { backgroundColor: 'rgba(240, 160, 51, 0.25)' },
  playing: { backgroundColor: colors.accent },
  pressed: { opacity: 0.6 },
  barContent: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6 },
  chord: { fontWeight: '700' },
  mark: { fontSize: text.base, opacity: 0.7 },
})
