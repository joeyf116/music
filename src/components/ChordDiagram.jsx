const STRING_GAP = 14
const FRET_GAP = 18
const FRETS_SHOWN = 5
const LEFT = 22
const TOP = 20

/**
 * A chord box: strings run top to bottom with the low string on the left, like a chord book.
 * `notes` are { string, fret, role } where role 'root' and 'bass' get their own colours.
 */
export default function ChordDiagram({ frets, notes, label }) {
  const strings = frets.length
  const fretted = frets.filter((f) => f !== null && f > 0)
  const high = Math.max(0, ...fretted)
  // Shapes that fit in the first four frets start at the nut; higher ones are labelled with their first fret.
  const base = high <= 4 ? 1 : Math.min(...fretted)
  const width = LEFT + (strings - 1) * STRING_GAP + 12
  const height = TOP + FRETS_SHOWN * FRET_GAP + 6
  const x = (s) => LEFT + s * STRING_GAP
  const y = (fret) => TOP + (fret - base + 0.5) * FRET_GAP

  // One finger across the lowest fret when it holds three or more strings with nothing open or muted between.
  const lowest = fretted.length ? Math.min(...fretted) : null
  const onLowest = frets.map((f, s) => (f === lowest ? s : null)).filter((s) => s !== null)
  const barre =
    lowest !== null && onLowest.length >= 3 && frets.slice(onLowest[0], onLowest.at(-1) + 1).every((f) => f !== null && f >= lowest) ? { from: onLowest[0], to: onLowest.at(-1) } : null

  return (
    <svg className="chord-diagram" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {base > 1 && (
        <text className="chord-base" x={LEFT - 8} y={y(base)}>
          {base}
        </text>
      )}
      {Array.from({ length: FRETS_SHOWN + 1 }, (_, i) => (
        <line key={i} className={i === 0 && base === 1 ? 'chord-nut' : 'chord-fret'} x1={x(0)} x2={x(strings - 1)} y1={TOP + i * FRET_GAP} y2={TOP + i * FRET_GAP} />
      ))}
      {frets.map((f, s) => (
        <g key={s}>
          <line className="chord-string" x1={x(s)} x2={x(s)} y1={TOP} y2={TOP + FRETS_SHOWN * FRET_GAP} />
          {(f === null || f === 0) && (
            <text className={`chord-open ${notes.find((n) => n.string === s)?.role === 'root' ? 'root' : ''}`} x={x(s)} y={TOP - 8}>
              {f === null ? '×' : '○'}
            </text>
          )}
        </g>
      ))}
      {barre && <rect className="chord-barre" x={x(barre.from) - 5.5} y={y(lowest) - 5.5} width={x(barre.to) - x(barre.from) + 11} height="11" rx="5.5" />}
      {notes
        .filter((n) => n.fret > 0)
        .map((n) => (
          <circle key={n.string} className={`chord-dot ${n.role === 'root' ? 'root' : n.role === 'bass' ? 'bass' : ''}`} cx={x(n.string)} cy={y(n.fret)} r="5.5" />
        ))}
    </svg>
  )
}
