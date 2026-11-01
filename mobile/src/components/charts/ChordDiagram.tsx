import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg'
import type { Voicing } from '@music/voicings.js'
import { colors } from '@/theme'

// The web's chord box (src/components/ChordDiagram.jsx): strings top to bottom with the low string on the left.
const STRING_GAP = 14
const FRET_GAP = 18
const FRETS_SHOWN = 5
const LEFT = 22
const TOP = 20
const SCALE = 1.6

export default function ChordDiagram({ frets, notes }: Pick<Voicing, 'frets' | 'notes'>) {
  const strings = frets.length
  const fretted = frets.filter((f): f is number => f !== null && f > 0)
  const high = Math.max(0, ...fretted)
  const base = high <= 4 ? 1 : Math.min(...fretted)
  const width = LEFT + (strings - 1) * STRING_GAP + 12
  const height = TOP + FRETS_SHOWN * FRET_GAP + 6
  const x = (s: number) => LEFT + s * STRING_GAP
  const y = (fret: number) => TOP + (fret - base + 0.5) * FRET_GAP

  // One finger across the lowest fret when it holds three or more strings with nothing open or muted between.
  const lowest = fretted.length ? Math.min(...fretted) : null
  const onLowest = frets.flatMap((f, s) => (f === lowest ? [s] : []))
  const barre =
    lowest !== null && onLowest.length >= 3 && frets.slice(onLowest[0], onLowest[onLowest.length - 1] + 1).every((f) => f !== null && f >= lowest) ? { from: onLowest[0], to: onLowest[onLowest.length - 1] } : null
  const dot = (role: Voicing['notes'][number]['role']) => (role === 'root' ? colors.root : role === 'bass' ? colors.third : colors.text)

  return (
    <Svg width={width * SCALE} height={height * SCALE} viewBox={`0 0 ${width} ${height}`}>
      {base > 1 ? (
        <SvgText x={LEFT - 8} y={y(base) + 3} fill={colors.muted} fontSize={9} textAnchor="end">
          {base}
        </SvgText>
      ) : null}
      {Array.from({ length: FRETS_SHOWN + 1 }, (_, i) => (
        <Line key={i} x1={x(0)} x2={x(strings - 1)} y1={TOP + i * FRET_GAP} y2={TOP + i * FRET_GAP} stroke={i === 0 && base === 1 ? colors.text : colors.borderStrong} strokeWidth={i === 0 && base === 1 ? 3 : 1} />
      ))}
      {frets.map((f, s) => (
        <G key={s}>
          <Line x1={x(s)} x2={x(s)} y1={TOP} y2={TOP + FRETS_SHOWN * FRET_GAP} stroke={colors.borderStrong} strokeWidth={1} />
          {f === null || f === 0 ? (
            <SvgText x={x(s)} y={TOP - 6} fill={notes.find((n) => n.string === s)?.role === 'root' ? colors.root : colors.muted} fontSize={10} textAnchor="middle">
              {f === null ? '×' : '○'}
            </SvgText>
          ) : null}
        </G>
      ))}
      {barre && lowest !== null ? <Rect x={x(barre.from) - 5.5} y={y(lowest) - 5.5} width={x(barre.to) - x(barre.from) + 11} height={11} rx={5.5} fill={colors.text} /> : null}
      {notes
        .filter((n) => n.fret > 0)
        .map((n) => (
          <Circle key={n.string} cx={x(n.string)} cy={y(n.fret)} r={5.5} fill={dot(n.role)} />
        ))}
    </Svg>
  )
}
