import { describe, expect, it } from 'vitest'
import { fretboardView } from './fretboardView.js'
import { addItem, createItem, moveItem, practiceColumns, practiceScore, progressionItems, removeItem, setItemBeats, validItems } from './practiceTab.js'
import { TUNINGS } from './theory.js'

const tuning = TUNINGS.standard.pitches
const page = { view: 'chord', keyName: 'G', scaleType: 'major', chordDegree: 0, chordOverride: '', sevenths: false, voicingType: 'shapes', voicingIndex: 0, layout: 'position', position: 0, tuning, tuningId: 'standard' }
const chord = createItem(fretboardView(page).pin, 'a')
const run = createItem(fretboardView({ ...page, view: 'scale' }).pin, 'b')
const caged = createItem(fretboardView({ ...page, voicingType: 'caged' }).pin, 'c')

describe('practice tab items', () => {
  it('keeps the frets it was pinned with, whatever the page shows next', () => {
    expect(chord).toMatchObject({ id: 'a', kind: 'chord', name: 'G', key: 'G', beats: 4 })
    expect(run.beats).toBe(1)
    const later = fretboardView({ ...page, keyName: 'E' }).pin
    expect(later.columns).not.toEqual(chord.columns)
  })

  it('adds, moves, removes and sets beats', () => {
    let items = addItem(addItem([], chord), run)
    items = moveItem(items, 1, -1)
    expect(items.map((i) => i.id)).toEqual(['b', 'a'])
    expect(moveItem(items, 0, -1)).toBe(items)
    items = setItemBeats(items, 1, 2)
    expect(items[1].beats).toBe(2)
    expect(setItemBeats(items, 1, 3)[1].beats).toBe(2)
    expect(removeItem(items, 0).map((i) => i.id)).toEqual(['a'])
  })

  it('drops stored items that are broken', () => {
    expect(validItems([chord, { id: 'x', name: 'Bad', columns: [{ notes: [{ string: 'a' }] }] }, null])).toEqual([chord])
    expect(validItems('nope')).toEqual([])
  })
})

describe('practice tab playback', () => {
  it('lays every item out as one tab with a bar line between items', () => {
    const { columns, owner } = practiceColumns([chord, caged])
    expect(columns[0].heading).toBe('G')
    expect(columns[1]).toMatchObject({ heading: 'G', groupStart: true })
    expect(owner.at(-1)).toBe(1)
    expect(columns).toHaveLength(1 + caged.columns.length)
  })

  it('rings a chord for its beats and a run a beat a note, rounded up to whole bars', () => {
    const score = practiceScore([chord, run], tuning)
    const beat = score.meter.beatTicks
    expect(score.events[0]).toMatchObject({ tick: 0, column: 0, strum: 'down' })
    expect(score.events[1].tick).toBe(4 * beat)
    expect(score.totalTicks % score.meter.barTicks).toBe(0)
    expect(score.totalTicks).toBeGreaterThanOrEqual((4 + run.columns.length) * beat)
    expect(score.events[0].notes[0].pitch).toBe(tuning[score.events[0].notes[0].string] + score.events[0].notes[0].fret)
  })

  it('spreads a chord over its beats as an arpeggio, every note on the chord’s column', () => {
    const score = practiceScore([chord], tuning, 'arpeggio')
    expect(score.events.every((e) => e.column === 0 && e.notes.length === 1)).toBe(true)
    expect(score.events.length).toBe(chord.columns[0].notes.length)
    const pitches = score.events.map((e) => e.notes[0].pitch)
    expect(pitches).toEqual([...pitches].sort((a, b) => a - b))
  })

  it('plucks block chords together', () => {
    expect(practiceScore([chord], tuning, 'block').events[0].strum).toBeUndefined()
  })
})

describe('starting from a progression', () => {
  it('pins one close voicing per chord and reports what it could not read', () => {
    const { items, errors } = progressionItems('I V vi zz IV', 'G', tuning, 'standard')
    expect(items.map((i) => `${i.name} ${i.detail}`)).toEqual(['G I in G', 'D V in G', 'Em vi in G', 'C IV in G'])
    expect(items.every((i) => i.kind === 'chord' && i.columns[0].notes.length >= 3)).toBe(true)
    expect(errors).toEqual(['zz'])
  })
})
