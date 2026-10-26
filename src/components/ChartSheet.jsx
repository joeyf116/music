import { chordParts } from '../lib/chart.js'

const BARS_PER_ROW = 4

function Chord({ symbol }) {
  const { root, quality, bass } = chordParts(symbol)
  return (
    <span className="chart-chord">
      {root}
      {quality && <sup>{quality}</sup>}
      {bass && <small>/{bass}</small>}
    </span>
  )
}

function BarContent({ text }) {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return null
  if (tokens.length === 1 && tokens[0] === '%') return <span className="chart-repeat" aria-label="repeat previous bar">𝄎</span>
  return tokens.map((t, i) =>
    t === '/' || t === '-' ? (
      <span key={i} className="chart-slash" aria-hidden="true">
        /
      </span>
    ) : /^(n\.?c\.?|x)$/i.test(t) ? (
      <span key={i} className="chart-nc">N.C.</span>
    ) : (
      <Chord key={i} symbol={t} />
    ),
  )
}

/** The lead sheet grid: sections down the page, four bars to a row, the playing bar lit. */
export default function ChartSheet({ chart, activeBar = null, startBar = 0, onBarClick }) {
  // Number of the first bar in each section, counting through the whole chart.
  const firsts = chart.sections.reduce((acc, section, s) => [...acc, s ? acc[s - 1] + chart.sections[s - 1].bars.length : 0], [])
  return (
    <div className="chart-sheet" aria-label="Chart">
      {chart.sections.map((section, s) => {
        const first = firsts[s]
        const rows = []
        for (let r = 0; r < section.bars.length; r += BARS_PER_ROW) rows.push(section.bars.slice(r, r + BARS_PER_ROW))
        return (
          <div className="chart-section" key={s}>
            {section.label && <span className="chart-label">{section.label}</span>}
            {rows.map((row, r) => (
              <div className="chart-row" key={r}>
                {row.map((text, b) => {
                  const bar = first + r * BARS_PER_ROW + b
                  const classes = ['chart-bar', bar === activeBar && 'playing', activeBar === null && bar === startBar && startBar > 0 && 'start'].filter(Boolean).join(' ')
                  return (
                    <button type="button" key={b} className={classes} onClick={() => onBarClick?.(bar)} aria-label={`Bar ${bar + 1}${text ? `: ${text}` : ''}`} aria-current={bar === activeBar ? 'true' : undefined}>
                      <BarContent text={text} />
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
