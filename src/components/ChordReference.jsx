import { useEffect, useMemo, useRef, useState } from 'react'
import { playChord } from '../lib/audio.js'
import { chordParts } from '../lib/chart.js'
import { TUNINGS } from '../lib/theory.js'
import { chartChords, fretText, voicingsFor } from '../lib/voicings.js'
import usePersistentState from '../lib/usePersistentState.js'
import ChordDiagram from './ChordDiagram.jsx'
import { Field } from './controls.jsx'
import TuningSelect from './TuningSelect.jsx'

function ChordCard({ symbol, chord, tuning, playing }) {
  const voicings = useMemo(() => voicingsFor(chord, tuning), [chord, tuning])
  const [index, setIndex] = useState(0)
  const i = Math.min(index, Math.max(0, voicings.length - 1))
  const v = voicings[i]
  const { root, quality, bass } = chordParts(symbol)
  const name = (
    <>
      {root}
      {quality && <sup>{quality}</sup>}
      {bass && <small>/{bass}</small>}
    </>
  )
  const step = (d) => setIndex((i + d + voicings.length) % voicings.length)

  return (
    <li className={`chord-card${playing ? ' playing' : ''}`} data-symbol={symbol}>
      <span className="chord-name">{name}</span>
      {v ? (
        <>
          <button type="button" className="chord-shape" onClick={() => playChord(v.notes.map((n) => n.pitch))} aria-label={`Play ${symbol}: ${fretText(v.frets)}`}>
            <ChordDiagram frets={v.frets} notes={v.notes} label={`${symbol} chord diagram`} />
            <span className="chord-frets">{fretText(v.frets)}</span>
          </button>
          {v.partial && <span className="chord-note">simplified</span>}
          {voicings.length > 1 && (
            <span className="chord-cycle">
              <button type="button" className="icon-button" onClick={() => step(-1)} aria-label={`Previous ${symbol} voicing`}>
                ‹
              </button>
              <span>
                {i + 1}/{voicings.length}
              </span>
              <button type="button" className="icon-button" onClick={() => step(1)} aria-label={`Next ${symbol} voicing`}>
                ›
              </button>
            </span>
          )}
        </>
      ) : (
        <span className="chord-note">No shape found</span>
      )}
    </li>
  )
}

/**
 * A fold-away strip of chord boxes for every chord in the chart, several voicings each.
 * The chord the band is playing is lit and scrolled into view.
 */
export default function ChordReference({ chart, playingSymbols = [], tuning = TUNINGS.standard.pitches, tuningId, onTuningChange }) {
  const [open, setOpen] = usePersistentState('music.chordShapesOpen', false)
  const chords = useMemo(() => chartChords(chart), [chart])
  const strip = useRef(null)
  const current = playingSymbols.at(-1)

  // Keep the playing chord in view inside the strip without scrolling the page.
  useEffect(() => {
    const el = strip.current
    if (!open || !el || !current) return
    const card = [...el.children].find((c) => c.dataset.symbol === current)
    if (!card) return
    const left = card.offsetLeft - el.offsetLeft
    if (left < el.scrollLeft || left + card.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollTo({ left: left - 8, behavior: 'smooth' })
  }, [open, current])

  if (!chords.length) return null
  return (
    <details className="chord-ref" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        Chord shapes <span className="chord-ref-count">{chords.length} chords</span>
      </summary>
      <div className="chord-ref-body">
        <div className="chord-ref-head">
          <p className="hint">Tap a shape to hear it · ‹ › for more voicings</p>
          {onTuningChange && (
            <Field label="Tuning" className="chord-ref-tuning">
              <TuningSelect value={tuningId} onChange={onTuningChange} />
            </Field>
          )}
        </div>
        <ul className="chord-strip" ref={strip}>
          {chords.map(({ symbol, chord }) => (
            <ChordCard key={symbol} symbol={symbol} chord={chord} tuning={tuning} playing={playingSymbols.includes(symbol)} />
          ))}
        </ul>
      </div>
    </details>
  )
}
