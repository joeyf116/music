import { useEffect, useRef } from 'react'
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native'
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg'
import type { Level, NeckNote } from '@music/fretboardView.js'
import { NUM_FRETS, degreeRole, noteRole, type NoteRole } from '@music/theory.js'
import { colors, text } from '@/theme'

// Same geometry as the web neck (src/components/Fretboard.jsx), drawn at a fixed size and scrolled sideways.
const LABEL_W = 26
const OPEN_W = 44
const FIRST_FRET_W = 66
const FRET_RATIO = 0.967
const STRING_GAP = 34
const TOP = 22
const BOTTOM = 34
const MARKERS = [3, 5, 7, 9, 15, 17, 19, 21]
const DOUBLE_MARKERS = [12, 24]
const NUT_X = LABEL_W + OPEN_W
const FRET_X = [NUT_X]
for (let f = 1; f <= NUM_FRETS; f++) FRET_X.push(FRET_X[f - 1] + FIRST_FRET_W * FRET_RATIO ** (f - 1))

const noteX = (fret: number) => (fret === 0 ? LABEL_W + OPEN_W / 2 : (FRET_X[fret - 1] + FRET_X[fret]) / 2)
const fretMid = (fret: number) => (FRET_X[fret - 1] + FRET_X[fret]) / 2

const ROLE_COLOR: Record<NoteRole, string> = { root: colors.root, third: colors.third, fifth: colors.fifth, seventh: colors.seventh, other: colors.other }
const FILL_OPACITY: Record<Level, number> = { faint: 0.3, path: 0.45, shape: 1, active: 1 }
const LEGEND: [NoteRole, string][] = [
  ['root', 'Root'],
  ['third', '3rd'],
  ['fifth', '5th'],
  ['seventh', '7th'],
  ['other', 'Other'],
]
const isRole = (role: string | undefined): role is NoteRole => role !== undefined && role in ROLE_COLOR

// Roots are squares and 7ths diamonds, so note roles can be told apart without colour.
function NoteMark({ role, level }: { role: NoteRole; level: Level }) {
  const common = {
    fill: ROLE_COLOR[role],
    fillOpacity: FILL_OPACITY[level],
    stroke: level === 'active' ? '#fff' : 'rgba(0,0,0,0.45)',
    strokeWidth: level === 'active' ? 3.5 : 1.5,
  }
  if (role === 'root') return <Rect x={-12.5} y={-12.5} width={25} height={25} rx={4} {...common} />
  if (role === 'seventh') return <Rect x={-11} y={-11} width={22} height={22} rx={3} rotation={45} {...common} />
  return <Circle r={13.5} {...common} />
}

interface FretboardProps {
  /** Open-string MIDI pitches, low string first. */
  tuning: number[]
  /** The scale or chord formula the notes' roles are read against. */
  intervals?: number[]
  notes: NeckNote[]
  label: (note: NeckNote) => string
  stringName: (string: number) => string
  onNotePress?: (note: NeckNote) => void
  frets?: number
}

/** The guitar neck. It scrolls sideways and brings the lit shape into view when it changes. */
export default function Fretboard({ tuning, intervals = [], notes, label, stringName, onNotePress, frets = NUM_FRETS }: FretboardProps) {
  const strings = tuning.length
  const width = FRET_X[frets] + 12
  const boardBottom = TOP + (strings - 1) * STRING_GAP
  const height = boardBottom + BOTTOM
  const y = (string: number) => TOP + (strings - 1 - string) * STRING_GAP
  const midY = (TOP + boardBottom) / 2

  const scroller = useRef<ScrollViewInstance>(null)
  const focused = notes.filter((n) => n.level === 'shape' || n.level === 'active').map((n) => n.fret)
  const focusFret = focused.length ? Math.min(...focused) : null
  useEffect(() => {
    if (focusFret !== null) scroller.current?.scrollTo({ x: Math.max(0, noteX(focusFret) - 48), animated: true })
  }, [focusFret])

  return (
    <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      <Svg width={width} height={height} accessibilityLabel="Guitar fretboard">
        <Rect x={NUT_X} y={TOP - 12} width={FRET_X[frets] - NUT_X} height={boardBottom - TOP + 24} rx={3} fill={colors.wood} />
        {MARKERS.filter((f) => f <= frets).map((f) => (
          <Circle key={f} cx={fretMid(f)} cy={midY} r={7} fill="#d9c9a8" opacity={0.55} />
        ))}
        {DOUBLE_MARKERS.filter((f) => f <= frets).map((f) => (
          <G key={f}>
            <Circle cx={fretMid(f)} cy={midY - STRING_GAP} r={7} fill="#d9c9a8" opacity={0.55} />
            <Circle cx={fretMid(f)} cy={midY + STRING_GAP} r={7} fill="#d9c9a8" opacity={0.55} />
          </G>
        ))}
        {FRET_X.slice(0, frets + 1).map((x, f) => (
          <Line key={f} x1={x} x2={x} y1={TOP - 12} y2={boardBottom + 12} stroke={f === 0 ? '#efe6d2' : '#b8bcc4'} strokeWidth={f === 0 ? 7 : 2.5} />
        ))}
        {tuning.map((_, s) => (
          <G key={s}>
            <Line x1={LABEL_W + 4} x2={FRET_X[frets]} y1={y(s)} y2={y(s)} stroke="#d8d2c4" strokeWidth={0.8 + (strings - 1 - s) * 0.35} />
            <SvgText x={LABEL_W / 2} y={y(s) + 4.5} fill={colors.muted} fontSize={13} textAnchor="middle">
              {stringName(s)}
            </SvgText>
          </G>
        ))}
        {Array.from({ length: frets + 1 }, (_, f) => {
          const marked = MARKERS.includes(f) || DOUBLE_MARKERS.includes(f)
          return (
            <SvgText key={f} x={noteX(f)} y={height - 8} fill={marked ? colors.text : colors.muted} fontWeight={marked ? '700' : '400'} fontSize={13} textAnchor="middle">
              {f}
            </SvgText>
          )
        })}
        {notes.map((n) => {
          const role = isRole(n.role) ? n.role : n.degree ? degreeRole(n.degree) : noteRole(n.interval, intervals)
          const faded = n.level === 'faint' || n.level === 'path'
          return (
            <G key={`${n.string}-${n.fret}`} x={noteX(n.fret)} y={y(n.string)} onPress={onNotePress ? () => onNotePress(n) : undefined}>
              <NoteMark role={role} level={n.level} />
              <SvgText y={4} fill={faded ? colors.text : colors.bg} fontSize={11.5} fontWeight="700" textAnchor="middle">
                {label(n)}
              </SvgText>
            </G>
          )
        })}
      </Svg>
    </ScrollView>
  )
}

/** Colour key for the note roles, shown under the neck. */
export function Legend() {
  return (
    <View style={styles.legend}>
      {LEGEND.map(([role, name]) => (
        <View key={role} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: ROLE_COLOR[role] }, role === 'root' && styles.square, role === 'seventh' && styles.diamond]} />
          <Text style={styles.legendText}>{name}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  square: { borderRadius: 2 },
  diamond: { borderRadius: 2, transform: [{ rotate: '45deg' }], width: 10, height: 10 },
  legendText: { color: colors.muted, fontSize: text.xs },
})
