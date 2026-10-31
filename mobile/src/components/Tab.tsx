import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg'
import type { Column } from '@music/fretboardView.js'
import { mono } from '@/theme'

const LEFT = 34
const LINE_GAP = 17
const TOP = 14
const HEADING_SPACE = 18
const PAPER = '#f7f4ec'
const FRET_BOX = 16

interface TabProps {
  columns: Column[]
  /** Names of the strings, low string first. */
  tuningNames: string[]
  columnWidth?: number
  active: number | null
  onSelect?: (index: number) => void
}

/** Splits columns into staves that fit `rowWidth`, breaking before a bar line where one fits. */
function staves(columns: Column[], perRow: number): (Column & { index: number })[][] {
  const rows: (Column & { index: number })[][] = []
  for (let i = 0; i < columns.length; ) {
    let end = Math.min(columns.length, i + perRow)
    if (end < columns.length && !columns[end].groupStart) {
      for (let j = end - 1; j > i; j--) {
        if (columns[j].groupStart) {
          end = j
          break
        }
      }
    }
    rows.push(columns.slice(i, end).map((c, k) => ({ ...c, index: i + k })))
    i = end
  }
  return rows
}

/** Guitar tablature, laid out like the web tab (src/components/Tab.jsx). Tapping a column selects it. */
export default function Tab({ columns, tuningNames, columnWidth = 30, active, onSelect }: TabProps) {
  const [rowWidth, setRowWidth] = useState(0)
  const strings = tuningNames.length
  const rows = rowWidth ? staves(columns, Math.max(1, Math.floor((rowWidth - LEFT - 10) / columnWidth))) : []
  const top = TOP + (columns.some((c) => c.heading) ? HEADING_SPACE : 0)
  const staffBottom = top + (strings - 1) * LINE_GAP
  const height = staffBottom + (columns.some((c) => c.sublabel) ? 44 : 28)
  const y = (string: number) => top + (strings - 1 - string) * LINE_GAP

  return (
    <View style={styles.paper} onLayout={(e) => setRowWidth(Math.round(e.nativeEvent.layout.width - 8))}>
      {rows.map((row, r) => (
        <Svg key={r} width={rowWidth} height={height} accessibilityLabel={`Tab line ${r + 1}`}>
          {tuningNames.map((name, s) => (
            <G key={s}>
              <SvgText x={12} y={y(s) + 4} fill="#6b675f" fontSize={12} fontWeight="700" textAnchor="middle">
                {name}
              </SvgText>
              <Line x1={LEFT - 8} x2={rowWidth - 4} y1={y(s)} y2={y(s)} stroke="#8d8a83" strokeWidth={1} />
            </G>
          ))}
          <Line x1={LEFT - 8} x2={LEFT - 8} y1={top} y2={staffBottom} stroke="#8d8a83" />
          <Line x1={rowWidth - 4} x2={rowWidth - 4} y1={top} y2={staffBottom} stroke="#8d8a83" />
          {row.map((col, k) => {
            const x = LEFT + k * columnWidth + columnWidth / 2
            const on = col.index === active
            const paper = on ? '#f5d9ad' : PAPER
            return (
              <G key={col.index} onPress={onSelect ? () => onSelect(col.index) : undefined}>
                <Rect x={x - columnWidth / 2} y={0} width={columnWidth} height={height} rx={4} fill={on ? 'rgba(240,160,51,0.35)' : 'transparent'} />
                {col.groupStart && k > 0 && <Line x1={x - columnWidth / 2} x2={x - columnWidth / 2} y1={top} y2={staffBottom} stroke="#8d8a83" />}
                {col.heading && (
                  <SvgText x={x - columnWidth / 2 + 3} y={top - 14} fill="#8a4b00" fontSize={12} fontWeight="700">
                    {col.heading}
                  </SvgText>
                )}
                {col.notes.map((n) => (
                  <G key={n.string}>
                    {/* A patch of paper behind the number hides the string line, as in printed tab. */}
                    <Rect x={x - FRET_BOX / 2 - 2} y={y(n.string) - FRET_BOX / 2} width={FRET_BOX + 4} height={FRET_BOX} fill={paper} />
                    <SvgText x={x} y={y(n.string) + 4.5} fill="#1c1c1c" fontFamily={mono} fontSize={13} fontWeight="700" textAnchor="middle">
                      {String(n.fret)}
                    </SvgText>
                  </G>
                ))}
                {col.label && (
                  <SvgText x={x} y={staffBottom + 20} fill="#3a372f" fontSize={11} fontWeight="600" textAnchor="middle">
                    {col.label}
                  </SvgText>
                )}
                {col.sublabel && (
                  <SvgText x={x} y={staffBottom + 36} fill="#6b675f" fontSize={11} textAnchor="middle">
                    {col.sublabel}
                  </SvgText>
                )}
              </G>
            )
          })}
        </Svg>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  paper: { backgroundColor: PAPER, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, minHeight: 40 },
})
