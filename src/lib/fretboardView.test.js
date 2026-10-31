import { describe, expect, it } from 'vitest'
import { activeColumnIndex, fretboardView, headingChips, neckNotes, noteLabeller } from './fretboardView.js'
import { TUNINGS } from './theory.js'

const tuning = TUNINGS.standard.pitches
const base = { view: 'scale', keyName: 'A', scaleType: 'minorPentatonic', chordDegree: 0, chordOverride: '', sevenths: false, drop: 'drop2', layout: 'position', position: 0, stringSet: 0, progression: 'I V vi IV', area: 'open', tuning, tuningId: 'standard' }

describe('fretboardView', () => {
  it('shows a scale position with its run up and back in the tab', () => {
    const m = fretboardView(base)
    expect(m.heading.title).toBe('A Minor Pentatonic')
    expect(m.shapes.options.map((o) => o.label)).toEqual(['Position 1', 'Position 2', 'Position 3', 'Position 4', 'Position 5', 'All'])
    expect(m.shapes.columns).toHaveLength(m.shapes.shape.length * 2 - 1)
    expect(headingChips(m, null).map((c) => c.name)).toEqual(['A', 'C', 'D', 'E', 'G'])
  })

  it('lights the played column on the neck and labels notes', () => {
    const m = fretboardView(base)
    const notes = neckNotes(m, 0, true, tuning)
    expect(notes.at(-1).level).toBe('active')
    const label = noteLabeller(m, 'intervals', tuning)
    expect(label(notes.find((n) => n.interval === 3))).toBe('♭3')
  })

  it('reads a progression token by token and reports what it cannot parse', () => {
    const m = fretboardView({ ...base, view: 'progression', progression: 'ii7 V7 zz Imaj7' })
    expect(m.badTokens).toEqual(['zz'])
    expect(m.goodChords.map((c) => c.chord.name)).toEqual(['Bm7', 'E7', 'Amaj7'])
    expect(activeColumnIndex(m, null)).toBe(0)
    expect(m.drill.settings.progression).toBe('ii7 V7 Imaj7')
  })

  it('uses the chosen chord type for inversions', () => {
    const m = fretboardView({ ...base, view: 'inversion', chordOverride: 'sus4' })
    expect(m.chordName).toBe('Asus4')
    expect(m.shapes.options.length).toBeGreaterThan(0)
  })
})
