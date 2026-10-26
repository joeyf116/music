import { NUM_FRETS, noteRole } from '../lib/theory.js'

const LABEL_W = 26
const OPEN_W = 44
const FIRST_FRET_W = 66
const FRET_RATIO = 0.967
const STRING_GAP = 32
const TOP = 22
const BOTTOM = 34
const MARKERS = [3, 5, 7, 9, 15, 17, 19, 21]
const DOUBLE_MARKERS = [12, 24]

const NUT_X = LABEL_W + OPEN_W
const FRET_X = [NUT_X]
for (let f = 1; f <= NUM_FRETS; f++) FRET_X.push(FRET_X[f - 1] + FIRST_FRET_W * FRET_RATIO ** (f - 1))

const noteX = (fret) => (fret === 0 ? LABEL_W + OPEN_W / 2 : (FRET_X[fret - 1] + FRET_X[fret]) / 2)

/**
 * SVG guitar neck. `notes` is a list of { string, fret, interval, level } where level is
 * 'faint' (in key), 'shape' (part of the selected shape) or 'active' (currently selected/playing).
 */
export default function Fretboard({ tuning, notes, label, stringName, onNoteClick }) {
  const strings = tuning.length
  const width = FRET_X[NUM_FRETS] + 12
  const boardBottom = TOP + (strings - 1) * STRING_GAP
  const height = boardBottom + BOTTOM
  const y = (string) => TOP + (strings - 1 - string) * STRING_GAP
  const midY = (TOP + boardBottom) / 2
  const fretMid = (f) => (FRET_X[f - 1] + FRET_X[f]) / 2

  return (
    <div className="fretboard-scroll">
      <svg className="fretboard" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Guitar fretboard">
        <rect className="board" x={NUT_X} y={TOP - 12} width={FRET_X[NUM_FRETS] - NUT_X} height={boardBottom - TOP + 24} rx="3" />

        {MARKERS.filter((f) => f <= NUM_FRETS).map((f) => (
          <circle key={f} className="marker" cx={fretMid(f)} cy={midY} r="7" />
        ))}
        {DOUBLE_MARKERS.filter((f) => f <= NUM_FRETS).map((f) => (
          <g key={f}>
            <circle className="marker" cx={fretMid(f)} cy={midY - STRING_GAP} r="7" />
            <circle className="marker" cx={fretMid(f)} cy={midY + STRING_GAP} r="7" />
          </g>
        ))}

        {FRET_X.map((x, f) => (
          <line key={f} className={f === 0 ? 'nut' : 'fret'} x1={x} x2={x} y1={TOP - 12} y2={boardBottom + 12} />
        ))}

        {tuning.map((_, s) => (
          <g key={s}>
            <line className="string" x1={LABEL_W + 4} x2={FRET_X[NUM_FRETS]} y1={y(s)} y2={y(s)} strokeWidth={0.8 + (strings - 1 - s) * 0.35} />
            <text className="string-name" x={LABEL_W / 2} y={y(s)}>
              {stringName(s)}
            </text>
          </g>
        ))}

        {Array.from({ length: NUM_FRETS + 1 }, (_, f) => (
          <text key={f} className={`fret-number${MARKERS.includes(f) || DOUBLE_MARKERS.includes(f) ? ' marked' : ''}`} x={noteX(f)} y={height - 10}>
            {f}
          </text>
        ))}

        {notes.map((n) => (
          <g
            key={`${n.string}-${n.fret}`}
            className={`note ${noteRole(n.interval)} ${n.level}`}
            transform={`translate(${noteX(n.fret)} ${y(n.string)})`}
            onClick={() => onNoteClick?.(n)}
          >
            <circle r="12.5" />
            <text>{label(n)}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
