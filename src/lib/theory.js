// Core music-theory helpers: notes, scales, chords, inversions and fretboard math.
// Pitches are MIDI note numbers (E2 = 40); pitch classes (pc) are 0-11 with C = 0.

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// Keys offered in the UI, with the spelling most guitarists expect.
export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export const NUM_FRETS = 22

// Tunings are listed from the lowest (6th) string to the highest (1st) string.
// `flats` spells the string names with flats (Eb, Bb) instead of sharps; `group` sorts the picker.
export const TUNING_GROUPS = ['Standard', 'Drop', 'Open', 'Other']

export const TUNINGS = {
  standard: { name: 'Standard', group: 'Standard', pitches: [40, 45, 50, 55, 59, 64] },
  halfDown: { name: 'Eb standard', group: 'Standard', flats: true, pitches: [39, 44, 49, 54, 58, 63] },
  dStandard: { name: 'D standard', group: 'Standard', flats: true, pitches: [38, 43, 48, 53, 57, 62] },
  cSharpStandard: { name: 'C# standard', group: 'Standard', pitches: [37, 42, 47, 52, 56, 61] },
  cStandard: { name: 'C standard', group: 'Standard', flats: true, pitches: [36, 41, 46, 51, 55, 60] },
  bStandard: { name: 'B standard', group: 'Standard', pitches: [35, 40, 45, 50, 54, 59] },
  dropD: { name: 'Drop D', group: 'Drop', pitches: [38, 45, 50, 55, 59, 64] },
  doubleDropD: { name: 'Double drop D', group: 'Drop', pitches: [38, 45, 50, 55, 59, 62] },
  dropCSharp: { name: 'Drop C#', group: 'Drop', pitches: [37, 44, 49, 54, 58, 63] },
  dropC: { name: 'Drop C', group: 'Drop', pitches: [36, 43, 48, 53, 57, 62] },
  dropB: { name: 'Drop B', group: 'Drop', pitches: [35, 42, 47, 52, 56, 61] },
  dropA: { name: 'Drop A', group: 'Drop', pitches: [33, 40, 45, 50, 54, 59] },
  openG: { name: 'Open G', group: 'Open', pitches: [38, 43, 50, 55, 59, 62] },
  openD: { name: 'Open D', group: 'Open', pitches: [38, 45, 50, 54, 57, 62] },
  openE: { name: 'Open E', group: 'Open', pitches: [40, 47, 52, 56, 59, 64] },
  openA: { name: 'Open A', group: 'Open', pitches: [40, 45, 52, 57, 61, 64] },
  openC: { name: 'Open C', group: 'Open', pitches: [36, 43, 48, 55, 60, 64] },
  openDMinor: { name: 'Open D minor', group: 'Open', pitches: [38, 45, 50, 53, 57, 62] },
  openGMinor: { name: 'Open G minor', group: 'Open', flats: true, pitches: [38, 43, 50, 55, 58, 62] },
  dadgad: { name: 'DADGAD', group: 'Other', pitches: [38, 45, 50, 55, 57, 62] },
  cgcgcd: { name: 'CGCGCD', group: 'Other', pitches: [36, 43, 48, 55, 60, 62] },
  allFourths: { name: 'All fourths', group: 'Other', pitches: [40, 45, 50, 55, 60, 65] },
}

export const SCALES = {
  major: { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  majorPentatonic: { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  blues: { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  majorBlues: { name: 'Major Blues', intervals: [0, 2, 3, 4, 7, 9] },
  harmonicMinor: { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  melodicMinor: { name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11] },
  dorian: { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  locrian: { name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
  phrygianDominant: { name: 'Phrygian Dominant', intervals: [0, 1, 4, 5, 7, 8, 10] },
}

export const CHORDS = {
  maj: { name: 'Major', symbol: '', intervals: [0, 4, 7] },
  min: { name: 'Minor', symbol: 'm', intervals: [0, 3, 7] },
  dim: { name: 'Diminished', symbol: 'dim', intervals: [0, 3, 6] },
  aug: { name: 'Augmented', symbol: 'aug', intervals: [0, 4, 8] },
  sus2: { name: 'Suspended 2nd', symbol: 'sus2', intervals: [0, 2, 7] },
  sus4: { name: 'Suspended 4th', symbol: 'sus4', intervals: [0, 5, 7] },
  maj7: { name: 'Major 7th', symbol: 'maj7', intervals: [0, 4, 7, 11] },
  dom7: { name: 'Dominant 7th', symbol: '7', intervals: [0, 4, 7, 10] },
  min7: { name: 'Minor 7th', symbol: 'm7', intervals: [0, 3, 7, 10] },
  m7b5: { name: 'Half-diminished (m7♭5)', symbol: 'm7♭5', intervals: [0, 3, 6, 10] },
  dim7: { name: 'Diminished 7th', symbol: 'dim7', intervals: [0, 3, 6, 9] },
  minMaj7: { name: 'Minor-Major 7th', symbol: 'm(maj7)', intervals: [0, 3, 7, 11] },
  six: { name: 'Major 6th', symbol: '6', intervals: [0, 4, 7, 9] },
  min6: { name: 'Minor 6th', symbol: 'm6', intervals: [0, 3, 7, 9] },
  add9: { name: 'Add 9', symbol: 'add9', intervals: [0, 4, 7, 14] },
  dom9: { name: 'Dominant 9th', symbol: '9', intervals: [0, 4, 7, 10, 14] },
}

// Chord types that have a clean inversion system on adjacent strings.
export const INVERSION_CHORDS = ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'dom7', 'min7', 'm7b5', 'dim7', 'minMaj7']

export const INVERSION_NAMES = ['Root position', '1st inversion', '2nd inversion', '3rd inversion']

const INTERVAL_NAMES = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7']

export const mod12 = (n) => ((n % 12) + 12) % 12

export const noteToPc = (name) => {
  const pc = SHARP_NAMES.indexOf(name)
  return pc >= 0 ? pc : FLAT_NAMES.indexOf(name)
}

export const usesFlats = (key) => key.includes('b') || key === 'F'

export const pcName = (pc, flats = false) => (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)]

// String names low to high, e.g. "C# F# B E G# C#".
export const tuningNotes = (tuning) => tuning.pitches.map((p) => pcName(p, tuning.flats)).join(' ')

export const pitchName = (pitch, flats = false) => `${pcName(pitch, flats)}${Math.floor(pitch / 12) - 1}`

// Name an interval (semitones above the root) in the context of its scale/chord formula.
export const intervalName = (semitones, intervals = []) => {
  if (semitones === 14) return '9'
  const s = mod12(semitones)
  const hasPerfect5th = intervals.includes(7)
  if (s === 6 && hasPerfect5th && !intervals.includes(5)) return '♯4' // e.g. Lydian
  if (s === 8 && !hasPerfect5th && intervals.includes(4)) return '♯5' // augmented
  if (s === 9 && !hasPerfect5th && intervals.includes(6)) return '♭♭7' // diminished 7th
  return INTERVAL_NAMES[s]
}

// Role used for colouring notes: root, third, fifth, seventh or other.
export const noteRole = (semitones) => {
  const s = mod12(semitones)
  if (s === 0) return 'root'
  if (s === 3 || s === 4) return 'third'
  if (s === 6 || s === 7 || s === 8) return 'fifth'
  if (s === 10 || s === 11) return 'seventh'
  return 'other'
}

// All fretboard positions whose pitch class is in `pcs`.
export const findPositions = (tuning, pcs, maxFret = NUM_FRETS) => {
  const set = new Set(pcs.map(mod12))
  const out = []
  tuning.forEach((open, string) => {
    for (let fret = 0; fret <= maxFret; fret++) {
      if (set.has(mod12(open + fret))) out.push({ string, fret })
    }
  })
  return out
}

/**
 * Build a playable scale shape starting from scale degree `degree` on the lowest string.
 * Seven-note scales use the 3-notes-per-string system; other scales use a 5-fret box.
 * Returns notes ordered from lowest to highest pitch: [{ string, fret, pitch, interval }].
 */
export const scalePosition = (rootPc, intervals, tuning, degree) => {
  const pcs = intervals.map((i) => mod12(rootPc + i))
  const intervalOf = (pitch) => intervals[pcs.indexOf(mod12(pitch))]
  const startFret = mod12(pcs[degree] - tuning[0])
  const notes = []

  if (intervals.length === 7) {
    let pitch = tuning[0] + startFret
    let idx = degree
    for (let string = 0; string < tuning.length; string++) {
      for (let n = 0; n < 3; n++) {
        notes.push({ string, fret: pitch - tuning[string], pitch, interval: intervalOf(pitch) })
        const next = (idx + 1) % 7
        pitch += mod12(intervals[next] - intervals[idx])
        idx = next
      }
    }
  } else {
    const lo = Math.max(0, startFret - 1)
    let last = -Infinity
    tuning.forEach((open, string) => {
      for (let fret = lo; fret <= lo + 4; fret++) {
        const pitch = open + fret
        if (pitch > last && pcs.includes(mod12(pitch))) {
          notes.push({ string, fret, pitch, interval: intervalOf(pitch) })
          last = pitch
        }
      }
    })
  }

  if (notes.some((n) => n.fret < 0)) {
    notes.forEach((n) => {
      n.fret += 12
      n.pitch += 12
    })
  }
  return notes
}

// Order of chord tones (low to high) for a given inversion.
// Triads use close voicings; 4-note chords use drop-2 voicings (the standard guitar inversions).
export const inversionOrder = (toneCount, inversion) => {
  if (toneCount === 3) return [0, 1, 2].map((k) => (inversion + k) % 3)
  return [0, 2, 3, 1].map((k) => (inversion + k) % 4)
}

// Groups of adjacent strings (each listed low to high), ordered from the highest strings down.
export const stringSets = (toneCount, stringCount = 6) => {
  const sets = []
  for (let top = stringCount - 1; top - toneCount + 1 >= 0; top--) {
    sets.push(Array.from({ length: toneCount }, (_, k) => top - toneCount + 1 + k))
  }
  return sets
}

const minFretOf = (notes) => Math.min(...notes.map((n) => n.fret))

/**
 * Voice a chord inversion on a set of adjacent strings (low to high).
 * Returns the lowest playable shape at or above `minFret` as [{ string, fret, pitch, interval }], or null.
 */
export const voiceInversion = (rootPc, intervals, tuning, strings, inversion, minFret = 0) => {
  const order = inversionOrder(intervals.length, inversion)
  const bassPc = mod12(rootPc + intervals[order[0]])
  for (let base = mod12(bassPc - tuning[strings[0]]); base <= NUM_FRETS; base += 12) {
    let pitch = tuning[strings[0]] + base
    const notes = [{ string: strings[0], fret: base, pitch, interval: intervals[order[0]] }]
    for (let k = 1; k < order.length; k++) {
      const pc = mod12(rootPc + intervals[order[k]])
      pitch += mod12(pc - pitch) || 12
      notes.push({ string: strings[k], fret: pitch - tuning[strings[k]], pitch, interval: intervals[order[k]] })
    }
    const frets = notes.map((n) => n.fret)
    if (Math.min(...frets) >= minFret && Math.max(...frets) <= NUM_FRETS) return notes
  }
  return null
}

/**
 * Every inversion of a chord on every adjacent string set. Within a string set the shapes
 * are ordered up the neck, finishing with the first shape an octave higher.
 */
export const chordInversions = (rootPc, intervals, tuning) =>
  stringSets(intervals.length, tuning.length).map((strings) => {
    const shapes = []
    for (let inversion = 0; inversion < intervals.length; inversion++) {
      const notes = voiceInversion(rootPc, intervals, tuning, strings, inversion)
      if (notes) shapes.push({ inversion, notes })
    }
    shapes.sort((a, b) => minFretOf(a.notes) - minFretOf(b.notes))
    const first = shapes[0]
    const octave = first && voiceInversion(rootPc, intervals, tuning, strings, first.inversion, minFretOf(first.notes) + 1)
    if (octave) shapes.push({ inversion: first.inversion, notes: octave })
    return { strings, shapes }
  })

const voicingPosition = (frets) => {
  const fretted = frets.filter((f) => f !== null && f > 0)
  return fretted.length ? Math.min(...fretted) : 0
}

// Score a candidate voicing (higher is better) or return null if it is not playable/valid.
function scoreVoicing(frets, tuning, rootPc, required) {
  const played = frets.map((f, s) => (f === null ? null : s)).filter((s) => s !== null)
  if (played.length < 4) return null
  const low = played[0]
  if (played[played.length - 1] - low + 1 !== played.length) return null // no muted strings in between
  if (mod12(tuning[low] + frets[low]) !== rootPc) return null // root in the bass
  const present = new Set(played.map((s) => mod12(tuning[s] + frets[s])))
  for (const pc of required) if (!present.has(pc)) return null

  const fretted = played.map((s) => frets[s]).filter((f) => f > 0)
  if (!fretted.length) return played.length * 10
  const min = Math.min(...fretted)
  const max = Math.max(...fretted)
  if (max - min > 3) return null
  let fingers = fretted.length
  if (fingers > 4) {
    // Needs an index-finger barre at the lowest fret, starting on the bass string.
    if (frets[low] !== min || played.some((s) => frets[s] === 0)) return null
    fingers = 1 + fretted.filter((f) => f > min).length
    if (fingers > 4) return null
  }
  return played.length * 10 - (max - min) * 2 - fingers
}

/**
 * Find playable chord voicings (one note per string, null = muted) at different positions on the neck.
 * Returns up to `limit` voicings sorted by position: [{ frets, notes }].
 */
export const chordVoicings = (rootPc, intervals, tuning, limit = 6) => {
  const pcs = intervals.map((i) => mod12(rootPc + i))
  const required = new Set(pcs)
  // The 5th may be omitted from chords with four or more notes.
  if (intervals.length >= 4 && intervals.includes(7)) required.delete(mod12(rootPc + 7))
  const candidates = []

  for (let start = 0; start <= 12; start++) {
    const options = tuning.map((open) => {
      const opts = [null]
      for (let f = start; f <= start + 3; f++) if (pcs.includes(mod12(open + f))) opts.push(f)
      return opts
    })
    let best = null
    const current = new Array(tuning.length).fill(null)
    const walk = (s) => {
      if (s === tuning.length) {
        const score = scoreVoicing(current, tuning, rootPc, required)
        if (score !== null && (!best || score > best.score)) best = { frets: [...current], score }
        return
      }
      for (const f of options[s]) {
        current[s] = f
        walk(s + 1)
      }
    }
    walk(0)
    if (best) candidates.push(best)
  }

  const key = (v) => v.frets.map((f) => (f === null ? 'x' : f)).join('-')
  const unique = [...new Map(candidates.map((c) => [key(c), c])).values()]
  unique.sort((a, b) => b.score - a.score)
  const chosen = []
  for (const v of unique) {
    const pos = voicingPosition(v.frets)
    if (chosen.every((c) => Math.abs(voicingPosition(c.frets) - pos) >= 2)) chosen.push(v)
    if (chosen.length >= limit) break
  }
  chosen.sort((a, b) => voicingPosition(a.frets) - voicingPosition(b.frets))
  return chosen.map(({ frets }) => ({
    frets,
    notes: frets
      .map((fret, string) => {
        if (fret === null) return null
        const pitch = tuning[string] + fret
        return { string, fret, pitch, interval: intervals.find((i) => mod12(rootPc + i) === mod12(pitch)) }
      })
      .filter(Boolean),
  }))
}
