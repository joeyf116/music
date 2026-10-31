import { describe, expect, it } from 'vitest'
import {
  CHORDS,
  SCALES,
  TUNINGS,
  TUNING_GROUPS,
  chordInversions,
  chordVoicings,
  diatonicChords,
  findPositions,
  intervalName,
  noteRole,
  inversionOrder,
  NUM_FRETS,
  mod12,
  noteToPc,
  pcName,
  pitchName,
  scaleAcrossNeck,
  scalePosition,
  sevenNoteScale,
  spellNotes,
  stringSets,
  tuningNotes,
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

describe('spelling', () => {
  const spell = (key, formula, rename = true) => spellNotes(key, formula.intervals, rename)
  it('puts every scale note on its own letter', () => {
    expect(spell('D', SCALES.minor).names.join(' ')).toBe('D E F G A Bb C')
    expect(spell('C', SCALES.minor).names.join(' ')).toBe('C D Eb F G Ab Bb')
    expect(spell('F#', SCALES.major).names.join(' ')).toBe('F# G# A# B C# D# E#')
    expect(spell('Eb', SCALES.minor).names.join(' ')).toBe('Eb F Gb Ab Bb Cb Db')
    expect(spell('A', SCALES.blues).names.join(' ')).toBe('A C D Eb E G')
    expect(spell('G', SCALES.harmonicMinor).names.join(' ')).toBe('G A Bb C D Eb F#')
  })

  it('renames a black-key scale root rather than use double flats, but keeps chord roots', () => {
    expect(spell('Ab', SCALES.locrian)).toEqual({ root: 'G#', names: 'G# A B C# D E F#'.split(' ') })
    expect(spell('Ab', SCALES.major).root).toBe('Ab')
    expect(spell('C', CHORDS.dim7, false).names.join(' ')).toBe('C Eb Gb Bbb')
    expect(spell('C', CHORDS.augMaj7, false).names.join(' ')).toBe('C E G# B')
  })

  it('reads any note spelling', () => {
    expect(noteToPc('Cb')).toBe(11)
    expect(noteToPc('E#')).toBe(5)
    expect(noteToPc('Bbb')).toBe(9)
    expect(noteToPc('H')).toBe(-1)
  })

  it('colours notes by their degree in context', () => {
    expect(noteRole(8, SCALES.minor.intervals)).toBe('other') // ♭6, not a 5th
    expect(noteRole(8, CHORDS.aug.intervals)).toBe('fifth') // ♯5
    expect(noteRole(6, SCALES.lydian.intervals)).toBe('other') // ♯4
    expect(noteRole(9, CHORDS.dim7.intervals)).toBe('seventh') // ♭♭7
    expect(noteRole(3)).toBe('third')
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

  it('stacks drop-3 seventh chords with the bass a string apart', () => {
    expect(inversionOrder(4, 0, 'drop3')).toEqual([0, 3, 1, 2])
    expect(inversionOrder(4, 1, 'drop3')).toEqual([1, 0, 2, 3])
    expect(stringSets(4, 6, 'drop3')).toEqual([[1, 3, 4, 5], [0, 2, 3, 4]])
    // Triads ignore the drop setting.
    expect(stringSets(3, 6, 'drop3')).toEqual(stringSets(3))
    const notes = voiceInversion(0, CHORDS.maj7.intervals, STANDARD, [0, 2, 3, 4], 0, 0, 'drop3')
    expect(shape(notes)).toBe('0:8 2:9 3:9 4:8')
    expect(notes.map((n) => n.interval)).toEqual([0, 11, 4, 7])
  })

  it('finds every drop-3 inversion on both string sets', () => {
    const sets = chordInversions(0, CHORDS.dom7.intervals, STANDARD, 'drop3')
    expect(sets).toHaveLength(2)
    for (const { shapes } of sets) expect(new Set(shapes.map((s) => s.inversion)).size).toBe(4)
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

describe('tunings', () => {
  it('spells each tuning from its pitches', () => {
    expect(tuningNotes(TUNINGS.standard)).toBe('E A D G B E')
    expect(tuningNotes(TUNINGS.halfDown)).toBe('Eb Ab Db Gb Bb Eb')
    expect(tuningNotes(TUNINGS.cSharpStandard)).toBe('C# F# B E G# C#')
    expect(tuningNotes(TUNINGS.dropC)).toBe('C G C F A D')
    expect(tuningNotes(TUNINGS.dadgad)).toBe('D A D G A D')
    expect(tuningNotes(TUNINGS.openG)).toBe('D G D G B D')
  })

  it('has six rising strings in a known group for every tuning', () => {
    for (const t of Object.values(TUNINGS)) {
      expect(t.pitches).toHaveLength(6)
      t.pitches.slice(1).forEach((p, i) => expect(p).toBeGreaterThan(t.pitches[i]))
      expect(TUNING_GROUPS).toContain(t.group)
    }
  })

  it('finds chord shapes and inversions in every tuning', () => {
    for (const t of Object.values(TUNINGS)) {
      expect(chordVoicings(0, CHORDS.maj.intervals, t.pitches).length).toBeGreaterThan(0)
      const sets = chordInversions(0, CHORDS.maj.intervals, t.pitches)
      expect(sets.every((set) => set.shapes.length > 0)).toBe(true)
    }
  })
})

describe('scaleAcrossNeck', () => {
  const STD = TUNINGS.standard.pitches
  const run = (rootPc, intervals, degree = 0) => scaleAcrossNeck(rootPc, intervals, STD, degree)

  it('climbs the neck string by string, always ascending in pitch', () => {
    const notes = run(7, SCALES.major.intervals)
    expect(notes[0]).toMatchObject({ string: 0, fret: 3, interval: 0 })
    notes.slice(1).forEach((n, i) => expect(n.pitch).toBeGreaterThan(notes[i].pitch))
    const lowest = (s) => Math.min(...notes.filter((n) => n.string === s).map((n) => n.fret))
    expect(lowest(5) - lowest(0)).toBeGreaterThanOrEqual(7)
  })

  it('stays in the scale with playable stretches on each string', () => {
    const intervals = SCALES.minorPentatonic.intervals
    const notes = run(9, intervals)
    notes.forEach((n) => expect(intervals).toContain(mod12(n.pitch - 9)))
    for (let s = 0; s < 6; s++) {
      const frets = notes.filter((n) => n.string === s).map((n) => n.fret)
      expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(5)
    }
  })

  it('never runs past the last fret', () => {
    const notes = run(9, SCALES.major.intervals, 3)
    expect(Math.max(...notes.map((n) => n.fret))).toBeLessThanOrEqual(NUM_FRETS)
  })
})

describe('chords in a key', () => {
  const read = (key, scale, sevenths) => diatonicChords(key, scale, sevenths).map((c) => `${c.numeral}:${c.name}`).join(' ')

  it('harmonises major and minor keys with Roman numerals counted from the major scale', () => {
    expect(read('C', 'major')).toBe('I:C ii:Dm iii:Em IV:F V:G vi:Am vii°:Bdim')
    expect(read('A', 'minor')).toBe('i:Am ii°:Bdim ♭III:C iv:Dm v:Em ♭VI:F ♭VII:G')
    expect(read('G', 'major', true)).toBe('Imaj7:Gmaj7 ii7:Am7 iii7:Bm7 IVmaj7:Cmaj7 V7:D7 vi7:Em7 viiø7:F#m7♭5')
  })

  it('keeps the mode whatever the key, and spells every chord on its own letter', () => {
    expect(read('E', 'dorian')).toBe('i:Em ii:F#m ♭III:G IV:A v:Bm vi°:C#dim ♭VII:D')
    expect(read('F#', 'major')).toBe('I:F# ii:G#m iii:A#m IV:B V:C# vi:D#m vii°:E#dim')
    expect(read('A', 'harmonicMinor', true)).toBe('imaj7:Am(maj7) iiø7:Bm7♭5 ♭III+maj7:Cmaj7♯5 iv7:Dm7 V7:E7 ♭VImaj7:Fmaj7 vii°7:G#dim7')
  })

  it('uses the parent scale for pentatonic and blues scales', () => {
    expect(sevenNoteScale('minorPentatonic')).toBe('minor')
    expect(sevenNoteScale('majorBlues')).toBe('major')
    expect(sevenNoteScale('lydian')).toBe('lydian')
    expect(read('A', 'blues')).toBe(read('A', 'minor'))
  })
})

describe('math rock tunings', () => {
  it('lists FACGCE, Open C6 and Open F in their own group', () => {
    const names = Object.values(TUNINGS).filter((t) => t.group === 'Math rock').map((t) => `${t.name} ${tuningNotes(t)}`)
    expect(names).toEqual(['FACGCE F A C G C E', 'Open C6 C A C G C E', 'Open F F A C F C F'])
    expect(TUNING_GROUPS).toContain('Math rock')
  })
})
