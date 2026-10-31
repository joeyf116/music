import { playChord } from '../lib/audio.js'
import { SCALES, diatonicChords, sevenNoteScale } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Toggle } from './controls.jsx'

const SEVEN_NOTE_SCALES = Object.entries(SCALES).filter(([, s]) => s.intervals.length === 7)

// Close voicing around C3–B3, so every chord in the strip sounds in the same register.
const chordPitches = (chord) => chord.intervals.map((i) => 48 + chord.rootPc + i)

/**
 * A compact strip of the chords that belong to the current key and mode (I ii iii IV V vi vii° in major,
 * i ii° ♭III iv v ♭VI ♭VII in minor, and so on), always in view as a quick reference while building progressions.
 * Tapping a chord plays it, or hands it to `onPick` (e.g. to add it to a progression).
 * With `onScaleChange`, the strip also offers the mode, for pages that don't show a scale picker of their own.
 */
export default function DiatonicChords({ keyName, scaleId, onScaleChange, onPick, pickHint, highlight, sevenths: sharedSevenths, onSeventhsChange, silent = false, title }) {
  const [ownSevenths, setOwnSevenths] = usePersistentState('music.diatonicSevenths', false)
  // A page that also needs to know (the Fretboard voices the picked chord) can own the 7ths switch.
  const sevenths = sharedSevenths ?? ownSevenths
  const setSevenths = onSeventhsChange ?? setOwnSevenths
  const modeId = sevenNoteScale(scaleId)
  const chords = diatonicChords(keyName, modeId, sevenths)
  const root = chords[0].rootName
  const pick = (chord) => {
    // `silent`: the page plays the chord itself, as it is voiced on the neck.
    if (!silent) playChord(chordPitches(chord))
    onPick?.(chord)
  }

  return (
    <section className="diatonic" aria-label="Chords in this key">
      <div className="diatonic-head">
        <h3>
          {title ?? `Chords in ${root} ${onScaleChange ? '' : SCALES[modeId].name}`}
          {!title && !onScaleChange && modeId !== scaleId && <small> (parent of {SCALES[scaleId]?.name ?? 'the scale'})</small>}
        </h3>
        {onScaleChange && (
          <select className="diatonic-mode" value={modeId} onChange={(e) => onScaleChange(e.target.value)} aria-label="Mode">
            {SEVEN_NOTE_SCALES.map(([id, s]) => (
              <option key={id} value={id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <Toggle checked={sevenths} onChange={setSevenths}>
          7ths
        </Toggle>
      </div>
      <ol className={`diatonic-chords${sevenths ? ' sevenths' : ''}`}>
        {chords.map((c) => (
          <li key={c.degree}>
            <button
              type="button"
              className={`diatonic-chord${c.degree === 0 ? ' tonic' : ''}${highlight && highlight(c) ? ' on' : ''}`}
              onClick={() => pick(c)}
              aria-label={`${c.numeral}: ${c.name}${onPick ? ` (${pickHint ?? 'pick'})` : ' (play)'}`}
              aria-pressed={highlight ? Boolean(highlight(c)) : undefined}
            >
              <span className="numeral">{c.numeral}</span>
              <strong className="chord-label">{c.name}</strong>
            </button>
          </li>
        ))}
      </ol>
      {pickHint && <p className="hint diatonic-hint">Tap a chord to {pickHint}.</p>}
    </section>
  )
}
