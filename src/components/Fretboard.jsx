import { useEffect, useRef } from 'react'
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

// Roots are squares and 7ths diamonds so note roles can be told apart without colour.
const NoteMark = ({ role }) => {
  if (role === 'root') return <rect className="dot" x="-11.5" y="-11.5" width="23" height="23" rx="4" />
  if (role === 'seventh') return <rect className="dot" x="-10.5" y="-10.5" width="21" height="21" rx="3" transform="rotate(45)" />
  return <circle className="dot" r="12.5" />
}

// The full neck needs about 980px to stay readable; shorter necks scale that down.
const FULL_WIDTH = FRET_X[NUM_FRETS] + 12
const FULL_MIN_WIDTH = 980

const noteX = (fret) => (fret === 0 ? LABEL_W + OPEN_W / 2 : (FRET_X[fret - 1] + FRET_X[fret]) / 2)

/**
 * SVG guitar neck. `notes` is a list of { string, fret, interval, level } where level is
 * 'faint' (in key), 'shape' (part of the selected shape) or 'active' (currently selected/playing).
 * An optional `role` overrides the colour/shape picked from the interval. `frets` draws a shorter neck.
 */
export default function Fretboard({ tuning, notes, label, stringName, onNoteClick, frets = NUM_FRETS }) {
  const strings = tuning.length
  const width = FRET_X[frets] + 12
  const boardBottom = TOP + (strings - 1) * STRING_GAP
  const height = boardBottom + BOTTOM
  const y = (string) => TOP + (strings - 1 - string) * STRING_GAP
  const midY = (TOP + boardBottom) / 2
  const fretMid = (f) => (FRET_X[f - 1] + FRET_X[f]) / 2

  // On narrow screens the neck scrolls sideways: bring the selected shape into view when it changes.
  const scroller = useRef(null)
  const focused = notes.filter((n) => n.level === 'shape' || n.level === 'active').map((n) => n.fret)
  const focusFret = focused.length ? Math.min(...focused) : null
  useEffect(() => {
    const el = scroller.current
    if (focusFret === null || !el || el.scrollWidth <= el.clientWidth) return
    const x = (noteX(focusFret) / width) * el.scrollWidth
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: Math.max(0, x - 48), behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [focusFret, width])

  return (
    <>
      <div className="fretboard-scroll" ref={scroller}>
        <svg className="fretboard" style={{ minWidth: `${Math.round((FULL_MIN_WIDTH * width) / FULL_WIDTH)}px`, maxWidth: `${Math.round(width * 1.15)}px` }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Guitar fretboard">
          <rect className="board" x={NUT_X} y={TOP - 12} width={FRET_X[frets] - NUT_X} height={boardBottom - TOP + 24} rx="3" />

          {MARKERS.filter((f) => f <= frets).map((f) => (
            <circle key={f} className="marker" cx={fretMid(f)} cy={midY} r="7" />
          ))}
          {DOUBLE_MARKERS.filter((f) => f <= frets).map((f) => (
            <g key={f}>
              <circle className="marker" cx={fretMid(f)} cy={midY - STRING_GAP} r="7" />
              <circle className="marker" cx={fretMid(f)} cy={midY + STRING_GAP} r="7" />
            </g>
          ))}

          {FRET_X.slice(0, frets + 1).map((x, f) => (
            <line key={f} className={f === 0 ? 'nut' : 'fret'} x1={x} x2={x} y1={TOP - 12} y2={boardBottom + 12} />
          ))}

          {tuning.map((_, s) => (
            <g key={s}>
              <line className="string" x1={LABEL_W + 4} x2={FRET_X[frets]} y1={y(s)} y2={y(s)} strokeWidth={0.8 + (strings - 1 - s) * 0.35} />
              <text className="string-name" x={LABEL_W / 2} y={y(s)}>
                {stringName(s)}
              </text>
            </g>
          ))}

          {Array.from({ length: frets + 1 }, (_, f) => (
            <text key={f} className={`fret-number${MARKERS.includes(f) || DOUBLE_MARKERS.includes(f) ? ' marked' : ''}`} x={noteX(f)} y={height - 10}>
              {f}
            </text>
          ))}

          {notes.map((n) => {
            const role = n.role ?? noteRole(n.interval)
            return (
              <g key={`${n.string}-${n.fret}`} className={`note ${role} ${n.level}`} transform={`translate(${noteX(n.fret)} ${y(n.string)})`} onClick={() => onNoteClick?.(n)}>
                <NoteMark role={role} />
                <text>{label(n)}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className="scroll-hint">Swipe the neck to see more frets.</p>
    </>
  )
}
