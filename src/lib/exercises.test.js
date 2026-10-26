import { describe, expect, it } from 'vitest'
import {
  EXERCISES,
  METERS,
  buildExercise,
  countLabel,
  meterInfo,
  parseProgression,
  pickTokens,
  randomProgression,
  rateTicks,
  sequenceIndices,
} from './exercises.js'
import { strikeOrder, timeline } from './player.js'
import { TUNINGS, mod12 } from './theory.js'

const STANDARD = TUNINGS.standard.pitches
const frets = (event) => event.notes.map((n) => `${n.string}:${n.fret}`).join('+')

describe('meters and counting', () => {
  it('measures bars in ticks', () => {
    expect(meterInfo('4/4')).toMatchObject({ beatTicks: 12, barTicks: 48 })
    expect(meterInfo('6/8')).toMatchObject({ beatTicks: 6, barTicks: 36, groups: [0, 3] })
    expect(meterInfo('nope').id).toBe('4/4')
  })

  it('falls back to 8ths when a rate does not fit the bar', () => {
    expect(rateTicks('triplet', meterInfo('4/4'))).toBe(4)
    expect(rateTicks('triplet', meterInfo('7/8'))).toBe(6)
  })

  it('counts 1 e & a', () => {
    const m = meterInfo('4/4')
    expect([0, 3, 6, 9, 12, 48].map((t) => countLabel(t, m))).toEqual(['1', 'e', '&', 'a', '2', '1'])
  })
})

describe('sequences', () => {
  it('climbs and mirrors a pattern', () => {
    expect(sequenceIndices(5, [0])).toEqual([0, 1, 2, 3, 4, 3, 2, 1])
    expect(sequenceIndices(4, [0, 1, 2])).toEqual([0, 1, 2, 1, 2, 3, 3, 2, 1, 2, 1, 0])
    expect(sequenceIndices(4, [0, 2])).toEqual([0, 2, 1, 3, 3, 1, 2, 0])
  })
})

describe('progressions', () => {
  it('reads Roman numerals and chord names in a key', () => {
    const { chords, errors } = parseProgression('ii7 V7 Imaj7 bVII iiø7 Am F#m7b5 X', 'C')
    expect(chords.map((c) => c.name)).toEqual(['Dm7', 'G7', 'Cmaj7', 'Bb', 'Dm7♭5', 'Am', 'F#m7♭5'])
    expect(errors).toEqual(['X'])
  })

  it('turns triads into diatonic 7th chords', () => {
    const { chords } = parseProgression('I IV V vi vii°', 'G', { sevenths: true })
    expect(chords.map((c) => c.name)).toEqual(['Gmaj7', 'Cmaj7', 'D7', 'Em7', 'F#m7♭5'])
  })

  it('makes random progressions that start on the tonic and use known chords', () => {
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (const mode of ['major', 'minor']) {
      for (let i = 0; i < 20; i++) {
        const text = randomProgression(mode, 4, random)
        const tokens = text.split(' ')
        expect(tokens).toHaveLength(4)
        expect(tokens[0]).toBe(mode === 'major' ? 'I' : 'i')
        expect(parseProgression(text, 'E').errors).toEqual([])
      }
    }
  })

  it('strums the folk pattern with each chord change on the downbeat', () => {
    const score = buildExercise({ exercise: 'progression', key: 'G', progression: 'I IV', strum: 'folk' }, STANDARD)
    expect(score.bars).toBe(2)
    expect(score.events.map((e) => e.strum?.[0] ?? '-').join('')).toBe('d-du-udud-du-udu')
    expect(score.events[0].heading).toBe('G')
    expect(score.events[8].heading).toBe('C')
    // Up-strokes only catch the top strings.
    expect(Math.min(...score.events[3].notes.map((n) => n.string))).toBeGreaterThan(1)
  })

  it('travis picks alternating bass on the beat', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((j) => pickTokens('travis', j).join('+'))).toEqual(['B', 'm', 'A', 'i', 'B', 'm', 'A', 'a'])
    const score = buildExercise({ exercise: 'fingerstyle', key: 'C', progression: 'I', picking: 'travis' }, STANDARD)
    const bass = score.events.filter((_, i) => i % 2 === 0).map((e) => e.notes[0].string)
    expect(bass[0]).not.toBe(bass[1])
    expect(bass[0]).toBe(bass[2])
    expect(mod12(score.events[0].notes[0].pitch)).toBe(0)
  })

  it('splits two chords per bar', () => {
    const score = buildExercise({ exercise: 'progression', key: 'A', progression: 'I IV V I', chordLength: 0.5 }, STANDARD)
    expect(score.bars).toBe(2)
    expect(score.events.filter((e) => e.heading).map((e) => e.tick)).toEqual([0, 24, 48, 72])
  })
})

describe('melodic exercises', () => {
  it('arpeggiates every 7th chord in the key', () => {
    const score = buildExercise({ exercise: 'diatonicArpeggios', key: 'C', scale7: 'major', arpSize: 'sevenths' }, STANDARD)
    expect(score.events.filter((e) => e.heading).map((e) => e.heading)).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7♭5', 'Cmaj7'])
    expect(score.events[0].notes[0].degree).toBe('R')
    // Each group climbs.
    const first = score.events.slice(0, 4).map((e) => e.notes[0].pitch)
    first.forEach((p, i) => i && expect(p).toBeGreaterThan(first[i - 1]))
  })

  it('climbs the neck with triads on one string set', () => {
    const score = buildExercise({ exercise: 'triadSets', key: 'G', scale7: 'major', triadStyle: 'block', rate: 'quarter' }, STANDARD)
    const heads = score.events.filter((e) => e.heading)
    expect(heads.map((e) => e.heading)).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim', 'G'])
    heads.forEach((e) => expect(e.notes.map((n) => n.string)).toEqual([3, 4, 5]))
    // Each shape is a playable grip.
    heads.forEach((e) => expect(Math.max(...e.notes.map((n) => n.fret)) - Math.min(...e.notes.map((n) => n.fret))).toBeLessThanOrEqual(4))
  })

  it('plays chromatic finger patterns up and back down', () => {
    const score = buildExercise({ exercise: 'chromatic', fingers: '1324', startFret: 5, rate: 'sixteenth' }, STANDARD)
    expect(score.events.slice(0, 4).map(frets)).toEqual(['0:5', '0:7', '0:6', '0:8'])
    expect(score.events.slice(24, 28).map(frets)).toEqual(['5:8', '5:6', '5:7', '5:5'])
  })

  it('changes subdivision every bar in the ladder', () => {
    const score = buildExercise({ exercise: 'ladder', meter: '4/4' }, STANDARD)
    expect(score.bars).toBe(4)
    expect(score.events.filter((e) => e.barStart).map((e) => e.heading)).toEqual(['Quarter notes', '8th notes', '8th-note triplets', '16th notes'])
  })

  it('fills whole bars in every exercise, time signature and tuning', () => {
    for (const exercise of EXERCISES) {
      for (const meter of Object.keys(METERS)) {
        for (const tuning of [STANDARD, TUNINGS.dadgad.pitches, TUNINGS.dropC.pitches]) {
          const score = buildExercise({ exercise: exercise.id, meter }, tuning)
          expect(score.events.length).toBeGreaterThan(0)
          expect(score.totalTicks % score.meter.barTicks).toBe(0)
          score.events.forEach((e) => {
            expect(e.tick).toBeLessThan(score.totalTicks)
            e.notes.forEach((n) => {
              expect(n.fret).toBeGreaterThanOrEqual(0)
              expect(n.fret).toBeLessThanOrEqual(22)
              expect(n.pitch).toBe(tuning[n.string] + n.fret)
            })
          })
        }
      }
    }
  })
})

describe('player', () => {
  it('merges beat clicks with the events', () => {
    const score = buildExercise({ exercise: 'chromatic', rate: 'eighth', meter: '2/4' }, STANDARD)
    const items = timeline(score).slice(0, 4)
    expect(items).toEqual([{ tick: 0, click: true }, { tick: 0, index: 0 }, { tick: 6, index: 1 }, { tick: 12, click: false }])
  })

  it('rolls down-strums low to high and up-strums high to low', () => {
    const notes = [{ string: 3 }, { string: 1 }, { string: 5 }]
    expect(strikeOrder({ notes, strum: 'down' }).map((n) => n.string)).toEqual([1, 3, 5])
    expect(strikeOrder({ notes, strum: 'up' }).map((n) => n.string)).toEqual([5, 3, 1])
  })
})

describe('across-the-neck layout', () => {
  it('runs scale sequences diagonally instead of in one box', () => {
    const settings = { exercise: 'scaleSequence', key: 'A', scale: 'minorPentatonic', sequence: 'straight', position: 0 }
    const box = buildExercise({ ...settings, layout: 'position' }, STANDARD)
    const across = buildExercise({ ...settings, layout: 'across' }, STANDARD)
    const span = (score) => {
      const frets = score.events.flatMap((e) => e.notes.map((n) => n.fret))
      return Math.max(...frets) - Math.min(...frets)
    }
    expect(span(box)).toBeLessThanOrEqual(4)
    expect(span(across)).toBeGreaterThan(10)
    expect(across.events[0].notes[0]).toMatchObject({ string: 0, fret: 5 })
  })
})
