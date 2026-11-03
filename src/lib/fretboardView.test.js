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

describe('CAGED view', () => {
  const caged = { ...base, view: 'caged', scaleType: 'major', keyName: 'C', cagedShape: 'all' }

  it('climbs the neck through all five shapes, each chord then its box', () => {
    const m = fretboardView(caged)
    expect(m.heading.title).toBe('C major pentatonic · CAGED')
    expect(m.shapes.options.map((o) => o.label)).toEqual(['C', 'A', 'G', 'E', 'D', 'All'])
    const headings = m.shapes.columns.filter((c) => c.heading).map((c) => c.heading.split(' · ')[0])
    expect(headings).toEqual(['C shape', 'A shape', 'G shape', 'E shape', 'D shape'])
    expect(headingChips(m, null).map((c) => c.name)).toEqual(['C', 'D', 'E', 'G', 'A'])
  })

  it('shows one shape: the chord full, its box soft, and lights the note being played', () => {
    const m = fretboardView({ ...caged, cagedShape: 'E' })
    expect(m.shapes.optionIndex).toBe(3)
    expect(m.shapes.columns[0].notes).toHaveLength(6)
    const idle = neckNotes(m, null, false, tuning)
    expect(idle.filter((n) => n.level === 'shape')).toHaveLength(6)
    expect(idle.filter((n) => n.level === 'path').length).toBeGreaterThan(0)
    const playing = neckNotes(m, 1, false, tuning)
    expect(playing.filter((n) => n.level === 'active')).toHaveLength(1)
    expect(playing.some((n) => n.level === 'path')).toBe(false)
  })

  it('reads minor modes as the minor pentatonic', () => {
    const m = fretboardView({ ...caged, keyName: 'A', scaleType: 'dorian' })
    expect(m.heading.title).toBe('A minor pentatonic · CAGED')
    expect(m.drill.settings.chord).toBe('min')
  })
})
