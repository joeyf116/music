import { describe, expect, it } from 'vitest'
import { activeColumnIndex, columnDuration, fretboardView, legacyView, neckNotes, noteLabeller, resolveVoicingType, voicingTypesFor } from './fretboardView.js'
import { TUNINGS } from './theory.js'

const tuning = TUNINGS.standard.pitches
const base = { view: 'scale', keyName: 'A', scaleType: 'minorPentatonic', chordDegree: 0, chordOverride: '', sevenths: false, voicingType: 'shapes', voicingIndex: 0, layout: 'position', position: 0, tuning, tuningId: 'standard' }
const chords = { ...base, view: 'chord', keyName: 'C', scaleType: 'major' }

describe('Scale view', () => {
  it('shows a scale position with its run up and back in the tab', () => {
    const m = fretboardView(base)
    expect(m.heading.title).toBe('A Minor Pentatonic')
    expect(m.shapes.options.map((o) => o.label)).toEqual(['Position 1', 'Position 2', 'Position 3', 'Position 4', 'Position 5', 'All'])
    expect(m.shapes.columns).toHaveLength(m.shapes.shape.length * 2 - 1)
  })

  it('lights the played column on the neck and labels notes', () => {
    const m = fretboardView(base)
    const notes = neckNotes(m, 0, true, tuning)
    expect(notes.at(-1).level).toBe('active')
    const label = noteLabeller(m, 'intervals', tuning)
    expect(label(notes.find((n) => n.interval === 3))).toBe('♭3')
  })

  it('pins the run that is shown, as plain frets', () => {
    const { pin } = fretboardView({ ...base, position: 2 })
    expect(pin).toMatchObject({ kind: 'run', name: 'A Minor Pentatonic', key: 'A', tuningId: 'standard' })
    expect(pin.detail).toMatch(/^Position 3 · fr /)
    expect(Object.keys(pin.columns[0].notes[0])).toEqual(['string', 'fret'])
  })

  it('pins the whole neck from "All"', () => {
    const { pin, shapes } = fretboardView({ ...base, position: 'all' })
    expect(pin.detail).toBe('Whole neck')
    expect(pin.columns).toHaveLength(shapes.columns.length)
  })
})

describe('Chords view', () => {
  it('offers the voicing types a chord has', () => {
    expect(voicingTypesFor('maj').map((t) => t.value)).toEqual(['shapes', 'caged', 'triads'])
    expect(voicingTypesFor('dom7').map((t) => t.value)).toEqual(['shapes', 'drop2', 'drop3'])
    expect(voicingTypesFor('dim').map((t) => t.value)).toEqual(['shapes', 'triads'])
  })

  it('swaps triads and drop voicings when the chord gains or loses its 7th', () => {
    expect(resolveVoicingType('triads', 'maj7')).toBe('drop2')
    expect(resolveVoicingType('drop3', 'min')).toBe('triads')
    expect(resolveVoicingType('caged', 'dom7')).toBe('shapes')
    expect(resolveVoicingType('nonsense', 'maj')).toBe('shapes')
  })

  it('shows one full shape at a time and pins it', () => {
    const m = fretboardView(chords)
    expect(m.chordName).toBe('C')
    expect(m.voicings.length).toBeGreaterThan(1)
    expect(m.shapes.columns).toHaveLength(1)
    expect(m.pin).toMatchObject({ kind: 'chord', name: 'C', detail: 'Shape · open' })
    const second = fretboardView({ ...chords, voicingIndex: 1 })
    expect(second.pin.columns[0].notes).not.toEqual(m.pin.columns[0].notes)
  })

  it('steps through triad inversions on every string set', () => {
    const m = fretboardView({ ...chords, voicingType: 'triads', chordDegree: 4 })
    expect(m.chordName).toBe('G')
    expect(m.voicings[0].label).toMatch(/^Strings [\d-]+ · (Root position|1st inversion|2nd inversion)$/)
    expect(new Set(m.voicings.map((v) => v.label.split(' · ')[0])).size).toBe(4)
    expect(m.shapes.shape).toHaveLength(3)
  })

  it('uses drop voicings for 7th chords', () => {
    const m = fretboardView({ ...chords, sevenths: true, voicingType: 'triads', chordDegree: 4 })
    expect(m.chordName).toBe('G7')
    expect(m.voicingType).toBe('drop2')
    expect(m.shapes.shape).toHaveLength(4)
    expect(m.pin.detail).toMatch(/^Drop 2 · Strings/)
  })

  it('keeps the index in range when the list gets shorter', () => {
    const m = fretboardView({ ...chords, voicingIndex: 999 })
    expect(m.voicingIndex).toBe(m.voicings.length - 1)
  })

  it('shows a CAGED shape inside its pentatonic box: chord then box run', () => {
    const m = fretboardView({ ...chords, voicingType: 'caged' })
    expect(m.voicings).toHaveLength(5)
    expect(m.shapes.columns[0].notes.length).toBeGreaterThan(3)
    expect(m.pin.kind).toBe('run')
    const idle = neckNotes(m, null, true, tuning)
    expect(idle.some((n) => n.level === 'faint')).toBe(false)
    expect(idle.some((n) => n.level === 'path')).toBe(true)
    const playing = neckNotes(m, 1, true, tuning)
    expect(playing.filter((n) => n.level === 'active')).toHaveLength(1)
  })

  it('reads a minor chord as the minor pentatonic for CAGED', () => {
    const m = fretboardView({ ...chords, voicingType: 'caged', chordDegree: 5 })
    expect(m.chordName).toBe('Am')
    expect(m.formula.intervals).toEqual([0, 3, 5, 7, 10])
  })

  it('lights the chord column by default', () => {
    const m = fretboardView(chords)
    expect(activeColumnIndex(m, null)).toBe(0)
    expect(columnDuration(m.shapes.columns[0], 60)).toBe(2000)
  })
})

describe('old saved views', () => {
  it('open in Chords with the matching voicing type', () => {
    expect(legacyView('inversion', 'drop3')).toEqual({ view: 'chord', voicingType: 'drop3' })
    expect(legacyView('caged')).toEqual({ view: 'chord', voicingType: 'caged' })
    expect(legacyView('progression')).toMatchObject({ view: 'chord', progression: true })
    expect(legacyView('scale')).toBeNull()
    expect(fretboardView({ ...chords, view: 'inversion' }).view).toBe('chord')
  })
})
