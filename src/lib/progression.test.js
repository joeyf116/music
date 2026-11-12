import { describe, expect, it } from 'vitest'
import {
  buildLine,
  createStep,
  duplicateStep,
  editVoicing,
  kindsFor,
  moveStep,
  practiceSession,
  removeStep,
  revoiceAll,
  scalePositions,
  stepChord,
  stepsFromPinned,
  stepsFromText,
  validSteps,
  voiceStep,
} from './progression.js'
import { TUNINGS, mod12 } from './theory.js'

const tuning = TUNINGS.standard.pitches
const ctx = { keyName: 'G', tuning }
const pop = stepsFromText('I V vi IV', ctx).steps

describe('naming chords in the key', () => {
  it('names a step by its chord and its numeral', () => {
    expect(pop.map((s) => stepChord(s, 'G').name)).toEqual(['G', 'D', 'Em', 'C'])
    expect(pop.map((s) => stepChord(s, 'G').numeral)).toEqual(['I', 'V', 'vi', 'IV'])
  })

  it('counts numerals from the major scale and spells flats from the key', () => {
    const { steps } = stepsFromText('i bVII bVI V7', { keyName: 'A', tuning })
    expect(steps.map((s) => stepChord(s, 'A').numeral)).toEqual(['i', '♭VII', '♭VI', 'V7'])
    expect(steps.map((s) => stepChord(s, 'A').name)).toEqual(['Am', 'G', 'F', 'E7'])
  })

  it('moves with the key, so changing the key transposes the whole progression', () => {
    expect(pop.map((s) => stepChord(s, 'C').name)).toEqual(['C', 'G', 'Am', 'F'])
  })
})

describe('voicings', () => {
  it('voices each chord close to the one before', () => {
    const notes = pop.map((s) => voiceStep(s, 'G', tuning).notes)
    notes.forEach((n) => expect(n.length).toBeGreaterThanOrEqual(3))
    const centres = notes.map((n) => n.reduce((a, b) => a + b.fret, 0) / n.length)
    for (let i = 1; i < centres.length; i++) expect(Math.abs(centres[i] - centres[i - 1])).toBeLessThan(6)
  })

  it('offers triads for triads and drop voicings for 7ths', () => {
    expect(kindsFor('maj').map((k) => k.value)).toEqual(['shapes', 'triads'])
    expect(kindsFor('dom7').map((k) => k.value)).toEqual(['shapes', 'drop2', 'drop3'])
    expect(kindsFor('add9').map((k) => k.value)).toEqual(['shapes'])
  })

  it('re-voices everything in one kind', () => {
    const triads = revoiceAll(pop, { ...ctx, kind: 'triads' })
    expect(triads.every((s) => s.kind === 'triads')).toBe(true)
    expect(triads.every((s) => voiceStep(s, 'G', tuning).notes.length === 3)).toBe(true)
  })

  it('edits a voicing by hand: move a string to another chord note, or mute it', () => {
    const notes = [
      { string: 1, fret: 3 },
      { string: 2, fret: 2 },
      { string: 3, fret: 0 },
    ]
    expect(editVoicing(notes, 2, 5)).toEqual([
      { string: 1, fret: 3 },
      { string: 2, fret: 5 },
      { string: 3, fret: 0 },
    ])
    expect(editVoicing(notes, 3, 0)).toEqual(notes.slice(0, 2))
    expect(editVoicing(notes.slice(0, 2), 1, 3)).toBeNull()
  })

  it('keeps hand-edited frets, moved to a new key', () => {
    const step = { ...pop[0], frets: [{ string: 0, fret: 3 }, { string: 1, fret: 5 }, { string: 2, fret: 5 }], fretsKey: 'G' }
    const v = voiceStep(step, 'A', tuning)
    expect(v.edited).toBe(true)
    expect(v.notes.map((n) => n.fret)).toEqual([5, 7, 7])
  })
})

describe('changing the progression', () => {
  it('moves, duplicates and removes', () => {
    const ids = (s) => s.map((x) => x.id)
    expect(ids(moveStep(pop, 0, 1))).toEqual([pop[1].id, pop[0].id, pop[2].id, pop[3].id])
    expect(moveStep(pop, 0, -1)).toBe(pop)
    const twice = duplicateStep(pop, 1, 'copy')
    expect(ids(twice)).toEqual([pop[0].id, pop[1].id, 'copy', pop[2].id, pop[3].id])
    expect(removeStep(pop, 0)).toHaveLength(3)
  })

  it('adds a chord from the key voiced near the last one', () => {
    const last = voiceStep(pop[3], 'G', tuning).notes
    const step = createStep({ rootPc: 2, type: 'dom7' }, { ...ctx, previous: last, kind: 'drop2' })
    expect(stepChord(step, 'G').name).toBe('D7')
    expect(step.kind).toBe('drop2')
  })

  it('drops broken stored steps', () => {
    expect(validSteps([pop[0], { id: 'x', offset: 'a', type: 'maj' }, { id: 'y', offset: 1, type: 'nope' }, null])).toHaveLength(1)
    expect(validSteps('nope')).toEqual([])
  })

  it('brings old pinned chords over, keeping their frets', () => {
    const pinned = [
      { id: 'a', kind: 'chord', name: 'Em', beats: 2, columns: [{ notes: [{ string: 0, fret: 0 }, { string: 1, fret: 2 }, { string: 2, fret: 2 }] }] },
      { id: 'b', kind: 'run', name: 'G Major', columns: [{ notes: [{ string: 0, fret: 3 }] }] },
    ]
    const steps = stepsFromPinned(pinned, 'G')
    expect(steps).toHaveLength(1)
    expect(stepChord(steps[0], 'G').name).toBe('Em')
    expect(steps[0].beats).toBe(2)
    expect(voiceStep(steps[0], 'G', tuning).notes.map((n) => n.fret)).toEqual([0, 2, 2])
  })
})

describe('scales through the changes', () => {
  const positions = scalePositions('G', 'major', tuning)

  it('lands on a chord note on every change and keeps to the position', () => {
    const voiced = pop.map((s) => ({ ...voiceStep(s, 'G', tuning), beats: 4 }))
    const lines = buildLine(voiced, positions[0].notes, 'scale', tuning)
    const frets = positions[0].notes.map((n) => n.fret)
    lines.forEach((line, k) => {
      expect(line).toHaveLength(8)
      const { chord } = voiced[k]
      expect(chord.intervals.map((i) => mod12(chord.rootPc + i))).toContain(mod12(line[0].pitch))
      line.forEach((n) => expect(frets).toContain(n.fret))
    })
    // It starts on the first chord's root.
    expect(mod12(lines[0][0].pitch)).toBe(voiced[0].chord.rootPc)
  })

  it('plays only chord notes as arpeggios', () => {
    const voiced = pop.map((s) => ({ ...voiceStep(s, 'G', tuning), beats: 2 }))
    const lines = buildLine(voiced, positions[0].notes, 'arpeggio', tuning)
    lines.forEach((line, k) => {
      const pcs = voiced[k].chord.intervals.map((i) => mod12(voiced[k].chord.rootPc + i))
      line.forEach((n) => expect(pcs).toContain(mod12(n.pitch)))
    })
  })
})

describe('the practice session', () => {
  it('lays chords out one column each, ringing for their beats', () => {
    const steps = [pop[0], { ...pop[1], beats: 2 }]
    const s = practiceSession({ steps, keyName: 'G', scaleType: 'major', tuning })
    expect(s.columns.map((c) => c.heading)).toEqual(['G', 'D'])
    expect(s.owner).toEqual([0, 1])
    const beat = s.score.meter.beatTicks
    expect(s.score.events[1].tick).toBe(4 * beat)
    expect(s.score.totalTicks).toBe(2 * s.score.meter.barTicks)
    expect(s.score.events[0].strum).toBe('down')
  })

  it('plays a line of 8th notes over quiet chords in Scales', () => {
    const s = practiceSession({ steps: pop, keyName: 'G', scaleType: 'major', tuning, mode: 'scales' })
    expect(s.columns).toHaveLength(32)
    expect(s.starts).toEqual([0, 8, 16, 24])
    expect(s.columns[8]).toMatchObject({ heading: 'D', groupStart: true })
    const chords = s.score.events.filter((e) => e.notes.length > 1)
    expect(chords).toHaveLength(4)
    expect(chords[0].ring).toBe(4 * s.score.meter.beatTicks)
    const alone = practiceSession({ steps: pop, keyName: 'G', scaleType: 'major', tuning, mode: 'scales', playLine: false })
    expect(alone.score.events.every((e) => e.notes.length > 1)).toBe(true)
  })

  it('works in a pentatonic scale', () => {
    const s = practiceSession({ steps: stepsFromText('i bVI bIII bVII', { keyName: 'A', tuning }).steps, keyName: 'A', scaleType: 'minorPentatonic', tuning, mode: 'scales', position: 0 })
    expect(s.positions).toHaveLength(5)
    expect(s.columns.length).toBe(32)
  })
})
