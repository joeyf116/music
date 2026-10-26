import { describe, expect, it } from 'vitest'
import {
  CHORDS,
  SCALES,
  TUNINGS,
  chordInversions,
  chordVoicings,
  findPositions,
  intervalName,
  inversionOrder,
  mod12,
  noteToPc,
  pcName,
  pitchName,
  scalePosition,
  stringSets,
  usesFlats,
  voiceInversion,
} from './theory.js'

const STANDARD = TUNINGS.standard.pitches
const shape = (notes) => notes.map((n) => `${n.string}:${n.fret}`).join(' ')
const tab = (frets) => frets.map((f) => (f === null ? 'x' : f)).join('')

describe('note helpers', () => {
  it('converts between names and pitch classes', () => {
    expect(noteToPc('C')).toBe(0)
    expect(noteToPc('Bb')).toBe(10)
    expect(noteToPc('F#')).toBe(6)
    expect(pcName(10, true)).toBe('Bb')
    expect(pcName(10, false)).toBe('A#')
    expect(pcName(-1)).toBe('B')
    expect(pitchName(40)).toBe('E2')
    expect(mod12(-13)).toBe(11)
  })

  it('chooses flat spelling for flat keys', () => {
    expect(usesFlats('Eb')).toBe(true)
    expect(usesFlats('F')).toBe(true)
    expect(usesFlats('G')).toBe(false)
  })

  it('names intervals in context', () => {
    expect(intervalName(6, SCALES.lydian.intervals)).toBe('♯4')
    expect(intervalName(6, SCALES.blues.intervals)).toBe('♭5')
    expect(intervalName(8, CHORDS.aug.intervals)).toBe('♯5')
    expect(intervalName(9, CHORDS.dim7.intervals)).toBe('♭♭7')
    expect(intervalName(9, CHORDS.six.intervals)).toBe('6')
    expect(intervalName(14, CHORDS.add9.intervals)).toBe('9')
  })
})

describe('fretboard positions', () => {
  it('finds every C on a 22-fret neck', () => {
    const positions = findPositions(STANDARD, [0])
    expect(positions).toContainEqual({ string: 1, fret: 3 })
    expect(positions).toContainEqual({ string: 0, fret: 8 })
    expect(positions).toContainEqual({ string: 4, fret: 1 })
    expect(positions).toHaveLength(12)
  })
})

describe('scale positions', () => {
  it('builds the A minor pentatonic boxes', () => {
    const { intervals } = SCALES.minorPentatonic
    expect(shape(scalePosition(9, intervals, STANDARD, 0))).toBe('0:5 0:8 1:5 1:7 2:5 2:7 3:5 3:7 4:5 4:8 5:5 5:8')
    expect(shape(scalePosition(9, intervals, STANDARD, 1))).toBe('0:8 0:10 1:7 1:10 2:7 2:10 3:7 3:9 4:8 4:10 5:8 5:10')
  })

  it('builds three-notes-per-string shapes for seven-note scales', () => {
    const notes = scalePosition(7, SCALES.major.intervals, STANDARD, 0)
    expect(notes).toHaveLength(18)
    expect(shape(notes.slice(0, 6))).toBe('0:3 0:5 0:7 1:3 1:5 1:7')
    // Pitches strictly ascend and every note is in G major.
    notes.forEach((n, i) => i && expect(n.pitch).toBeGreaterThan(notes[i - 1].pitch))
    const gMajor = SCALES.major.intervals.map((i) => mod12(7 + i))
    notes.forEach((n) => expect(gMajor).toContain(mod12(n.pitch)))
  })

  it('never returns negative frets', () => {
    for (const { intervals } of Object.values(SCALES)) {
      for (let root = 0; root < 12; root++) {
        intervals.forEach((_, degree) => {
          scalePosition(root, intervals, STANDARD, degree).forEach((n) => expect(n.fret).toBeGreaterThanOrEqual(0))
        })
      }
    }
  })
})

describe('inversions', () => {
  it('orders chord tones for triads and drop-2 seventh chords', () => {
    expect(inversionOrder(3, 0)).toEqual([0, 1, 2])
    expect(inversionOrder(3, 1)).toEqual([1, 2, 0])
    expect(inversionOrder(4, 0)).toEqual([0, 2, 3, 1])
    expect(inversionOrder(4, 3)).toEqual([3, 1, 2, 0])
  })

  it('lists adjacent string sets from high to low', () => {
    expect(stringSets(3)).toEqual([[3, 4, 5], [2, 3, 4], [1, 2, 3], [0, 1, 2]])
    expect(stringSets(4)).toHaveLength(3)
  })

  it('voices C major triads on the top three strings', () => {
    const { intervals } = CHORDS.maj
    expect(shape(voiceInversion(0, intervals, STANDARD, [3, 4, 5], 0))).toBe('3:5 4:5 5:3')
    expect(shape(voiceInversion(0, intervals, STANDARD, [3, 4, 5], 1))).toBe('3:9 4:8 5:8')
    expect(shape(voiceInversion(0, intervals, STANDARD, [3, 4, 5], 2))).toBe('3:0 4:1 5:0')
  })

  it('voices drop-2 Cmaj7 in root position on the low strings', () => {
    const notes = voiceInversion(0, CHORDS.maj7.intervals, STANDARD, [0, 1, 2, 3], 0)
    expect(shape(notes)).toBe('0:8 1:10 2:9 3:9')
    expect(notes.map((n) => n.interval)).toEqual([0, 7, 11, 4])
  })

  it('walks every inversion up the neck on each string set', () => {
    const sets = chordInversions(0, CHORDS.maj.intervals, STANDARD)
    expect(sets).toHaveLength(4)
    for (const { shapes } of sets) {
      expect(new Set(shapes.map((s) => s.inversion)).size).toBe(3)
      const starts = shapes.map((s) => Math.min(...s.notes.map((n) => n.fret)))
      expect([...starts].sort((a, b) => a - b)).toEqual(starts)
    }
  })
})

describe('chord voicings', () => {
  it('finds familiar open and barre shapes', () => {
    const voicings = (root, type) => chordVoicings(noteToPc(root), CHORDS[type].intervals, STANDARD).map((v) => tab(v.frets))
    expect(voicings('C', 'maj')).toContain('x32010')
    expect(voicings('G', 'maj')).toContain('320003')
    expect(voicings('F', 'maj')).toContain('133211')
    expect(voicings('A', 'min')).toContain('x02210')
    expect(voicings('C', 'min')).toContain('x35543')
    expect(voicings('A', 'dom7')).toContain('x02020')
  })

  it('always puts the root in the bass and includes the chord tones', () => {
    for (const [type, { intervals }] of Object.entries(CHORDS)) {
      for (let root = 0; root < 12; root++) {
        const voicings = chordVoicings(root, intervals, STANDARD)
        expect(voicings.length, `${root} ${type}`).toBeGreaterThan(0)
        for (const { notes } of voicings) {
          expect(mod12(notes[0].pitch)).toBe(root)
          notes.forEach((n) => expect(n.interval).toBeDefined())
        }
      }
    }
  })
})
