import { useEffect, useRef, useState } from 'react'

const ROW_WIDTH = 1040
const MIN_ROW_WIDTH = 300
const LEFT = 34
const LINE_GAP = 16
const TOP = 14

/**
 * Guitar tablature. Each column is { notes: [{ string, fret }], label, sublabel }.
 * Columns wrap onto multiple staves; clicking a column selects it.
 */
export default function Tab({ columns, tuningNames, columnWidth = 30, active, onSelect }) {
  // Match the row width to the container so text stays full size on phones instead of shrinking with the SVG.
  const hasColumns = columns.length > 0
  const container = useRef(null)
  const [rowWidth, setRowWidth] = useState(ROW_WIDTH)
  useEffect(() => {
    const el = container.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setRowWidth(Math.round(Math.max(MIN_ROW_WIDTH, Math.min(ROW_WIDTH, entry.contentRect.width)))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasColumns])

  const strings = tuningNames.length
  const perRow = Math.max(1, Math.floor((rowWidth - LEFT - 10) / columnWidth))
  const rows = []
  for (let i = 0; i < columns.length; i += perRow) rows.push(columns.slice(i, i + perRow).map((c, k) => ({ ...c, index: i + k })))
  const staffBottom = TOP + (strings - 1) * LINE_GAP
  const hasSub = columns.some((c) => c.sublabel)
  const height = staffBottom + (hasSub ? 44 : 28)
  // Highest string drawn at the top, like standard tab.
  const y = (string) => TOP + (strings - 1 - string) * LINE_GAP

  if (!columns.length) return <p className="empty">No shapes found for this selection.</p>

  return (
    <div className="tab" ref={container}>
      {rows.map((row, r) => (
        <svg key={r} viewBox={`0 0 ${rowWidth} ${height}`} className="tab-row" role="img" aria-label={`Tablature line ${r + 1}`}>
          {tuningNames.map((name, s) => (
            <g key={s}>
              <text className="tab-string" x={12} y={y(s)}>
                {name}
              </text>
              <line className="tab-line" x1={LEFT - 8} x2={rowWidth - 4} y1={y(s)} y2={y(s)} />
            </g>
          ))}
          <line className="tab-bar" x1={LEFT - 8} x2={LEFT - 8} y1={TOP} y2={staffBottom} />
          <line className="tab-bar" x1={rowWidth - 4} x2={rowWidth - 4} y1={TOP} y2={staffBottom} />
          {row.map((col, k) => {
            const x = LEFT + k * columnWidth + columnWidth / 2
            return (
              <g
                key={col.index}
                className={`tab-col${col.index === active ? ' active' : ''}${col.groupStart && k > 0 ? ' group-start' : ''}`}
                onClick={() => onSelect?.(col.index)}
              >
                <rect className="tab-hit" x={x - columnWidth / 2} y={0} width={columnWidth} height={height} rx="4" />
                {col.groupStart && k > 0 && <line className="tab-bar" x1={x - columnWidth / 2} x2={x - columnWidth / 2} y1={TOP} y2={staffBottom} />}
                {col.notes.map((n) => (
                  <text key={n.string} className="tab-fret" x={x} y={y(n.string)}>
                    {n.fret}
                  </text>
                ))}
                {col.label && (
                  <text className="tab-label" x={x} y={staffBottom + 20}>
                    {col.label}
                  </text>
                )}
                {col.sublabel && (
                  <text className="tab-sublabel" x={x} y={staffBottom + 36}>
                    {col.sublabel}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      ))}
    </div>
  )
}
