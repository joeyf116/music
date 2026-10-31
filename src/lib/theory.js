// Core music-theory helpers: notes, scales, chords, inversions and fretboard math.
// Pitches are MIDI note numbers (E2 = 40); pitch classes (pc) are 0-11 with C = 0.

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// Keys offered in the UI, with the spelling most guitarists expect.
export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export const NUM_FRETS = 22

// Tunings are listed from the lowest (6th) string to the highest (1st) string.
// `flats` spells the string names with flats (Eb, Bb) instead of sharps; `group` sorts the picker.
export const TUNING_GROUPS = ['Standard', 'Drop', 'Open', 'Math rock', 'Other']

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
  // Open, ringing tunings from math rock and Midwest emo: tap and play wide intervals with open strings droning.
  facgce: { name: 'FACGCE', group: 'Math rock', pitches: [41, 45, 48, 55, 60, 64] },
  openC6: { name: 'Open C6', group: 'Math rock', pitches: [36, 45, 48, 55, 60, 64] },
  openF: { name: 'Open F', group: 'Math rock', pitches: [41, 45, 48, 53, 60, 65] },
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
  melodicMinor: { name: 'Melodic Minor (jazz / ascending)', intervals: [0, 2, 3, 5, 7, 9, 11] },
  dorian: { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  locrian: { name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
  phrygianDominant: { name: 'Phrygian Dominant', intervals: [0, 1, 4, 5, 7, 8, 10] },
}

// Scales with fewer than seven notes take their chords from the seven-note scale they come from.
export const PARENT_SCALES = { majorPentatonic: 'major', minorPentatonic: 'minor', blues: 'minor', majorBlues: 'major' }

// The seven-note scale (mode) a scale belongs to: Minor Pentatonic → Natural Minor, Dorian stays Dorian.
export const sevenNoteScale = (id) => (SCALES[id]?.intervals.length === 7 ? id : (PARENT_SCALES[id] ?? 'major'))

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
  augMaj7: { name: 'Augmented Major 7th', symbol: 'maj7♯5', intervals: [0, 4, 8, 11] },
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

const LETTERS = 'CDEFGAB'
const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11]

// Any spelling a note can have (C, F#, Bb, Cb, E#, Fx-style doubles as ## / bb). Returns -1 if it isn't a note name.
export const noteToPc = (name) => {
  const m = /^([A-G])([#b♯♭]*)$/.exec(String(name ?? ''))
  if (!m) return -1
  const shift = [...m[2]].reduce((n, a) => n + (a === '#' || a === '♯' ? 1 : -1), 0)
  return mod12(LETTER_PCS[LETTERS.indexOf(m[1])] + shift)
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

// Scale degree (1-7) of an interval name such as 'R', '♭3', '♯4', '♭♭7' or '9' (a 9th is degree 2).
const degreeNumber = (name) => (name === 'R' ? 1 : ((Number(String(name).replace(/[^0-9]/g, '')) - 1) % 7) + 1)

// Role used for colouring notes, from the interval's name: root, third, fifth, seventh or other.
// A Lydian ♯4 or a minor ♭6 is "other", a diminished ♭♭7 is a 7th.
export const degreeRole = (name) => ['root', 'other', 'third', 'other', 'fifth', 'other', 'seventh'][degreeNumber(name) - 1] ?? 'other'

// Role of a note `semitones` above the root, read in the context of its scale/chord formula when given.
export const noteRole = (semitones, intervals = []) => degreeRole(intervalName(semitones, intervals))

/** `pc` spelled on the letter at index `letter` (0 = C), e.g. (11, 0) → 'Cb'. Null if it would need a triple accidental. */
export const spellOnLetter = (pc, letter) => {
  const diff = ((mod12(pc - LETTER_PCS[letter]) + 6) % 12) - 6
  if (Math.abs(diff) > 2) return null
  return LETTERS[letter] + (diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff))
}

const letterIndex = (name) => LETTERS.indexOf(String(name)[0])

/**
 * The note `semitones` above `rootName` in a scale or chord formula, on the letter its degree calls for:
 * D natural minor has Bb (not A#), F# major has E#, C dim7 has Bbb.
 */
export const spellInterval = (rootName, semitones, intervals = []) => {
  const pc = noteToPc(rootName) + semitones
  const letter = (letterIndex(rootName) + degreeNumber(intervalName(semitones, intervals)) - 1) % 7
  return spellOnLetter(mod12(pc), letter) ?? pcName(pc, usesFlats(rootName))
}

/** `toPc` named relative to a note already spelled as `fromName`, `letters` letter names higher (transposing Bb up a 3rd gives D). */
export const spellFrom = (fromName, toPc, letters, flats = false) => spellOnLetter(mod12(toPc), (((letterIndex(fromName) + letters) % 7) + 7) % 7) ?? pcName(toPc, flats)

const ENHARMONIC = { 'C#': 'Db', Db: 'C#', 'D#': 'Eb', Eb: 'D#', 'F#': 'Gb', Gb: 'F#', 'G#': 'Ab', Ab: 'G#', 'A#': 'Bb', Bb: 'A#' }
const doubleCount = (names) => names.filter((n) => /##|bb/.test(n)).length

/**
 * Note names of a scale or chord on `key`, one per interval, each on its own letter.
 * With `rename`, a black-key root switches to its other name when that avoids double sharps or flats
 * (Ab Locrian is written as G# Locrian). Returns { root, names }.
 */
export const spellNotes = (key, intervals, rename = false) => {
  const spell = (root) => intervals.map((i) => spellInterval(root, i, intervals))
  const names = spell(key)
  const other = ENHARMONIC[key]
  if (rename && other && doubleCount(names)) {
    const alt = spell(other)
    if (doubleCount(alt) < doubleCount(names)) return { root: other, names: alt }
  }
  return { root: key, names }
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

// Notes per string when running a scale diagonally: enough that each string starts a little higher up the neck.
export const acrossNotesPerString = (count) => (count <= 4 ? 2 : count === 5 ? 3 : 4)

/**
 * A scale (or arpeggio) run that climbs diagonally across the neck instead of staying in one box:
 * it starts on scale degree `degree` on the lowest string, like `scalePosition`, then plays a fixed number of
 * notes on every string (4 for seven-note scales, 3 for pentatonics, 2 for arpeggios), so each string shifts
 * up a position or two. Notes that would run past the last fret are dropped. Ordered low to high like `scalePosition`.
 */
export const scaleAcrossNeck = (rootPc, intervals, tuning, degree) => {
  const pcs = intervals.map((i) => mod12(rootPc + i))
  const perString = acrossNotesPerString(intervals.length)
  let idx = degree % intervals.length
  let pitch = tuning[0] + mod12(pcs[idx] - tuning[0])
  let notes = []
  // Arpeggio notes are far apart, so they move on sooner than a stretch would allow.
  const maxSpan = intervals.length <= 4 ? 4 : 5
  for (let string = 0; string < tuning.length; string++) {
    const first = pitch - tuning[string]
    for (let n = 0; n < perString && pitch - tuning[string] - first <= maxSpan; n++) {
      notes.push({ string, fret: pitch - tuning[string], pitch, interval: intervals[idx] })
      const next = (idx + 1) % intervals.length
      pitch += mod12(intervals[next] - intervals[idx]) || 12
      idx = next
    }
  }
  // Very wide tunings can leave a string's first note behind the nut; start the whole run an octave up.
  if (notes.some((n) => n.fret < 0)) notes = notes.map((n) => ({ ...n, fret: n.fret + 12, pitch: n.pitch + 12 }))
  return notes.filter((n) => n.fret >= 0 && n.fret <= NUM_FRETS)
}

// How a chord's notes are stacked on the strings. Triads are always close (three adjacent strings);
// 7th chords are drop-2 (four adjacent strings) or drop-3 (the bass note skips a string), the two standard guitar systems.
export const DROP_VOICINGS = {
  drop2: { name: 'Drop 2', title: 'Four adjacent strings: the 2nd voice from the top of a close chord dropped an octave' },
  drop3: { name: 'Drop 3', title: 'Bass note a string apart from the other three: the 3rd voice from the top dropped an octave' },
}

// Order of chord tones (low to high) for a given inversion.
// Triads use close voicings; 4-note chords use drop-2 voicings unless `drop` is 'drop3'.
export const inversionOrder = (toneCount, inversion, drop = 'drop2') => {
  if (toneCount === 3) return [0, 1, 2].map((k) => (inversion + k) % 3)
  return (drop === 'drop3' ? [0, 3, 1, 2] : [0, 2, 3, 1]).map((k) => (inversion + k) % 4)
}

// Groups of adjacent strings (each listed low to high), ordered from the highest strings down.
// Drop-3 sets leave one string out between the bass and the other three (6 4 3 2, 5 3 2 1).
export const stringSets = (toneCount, stringCount = 6, drop = 'drop2') => {
  const offsets = toneCount === 4 && drop === 'drop3' ? [0, 2, 3, 4] : Array.from({ length: toneCount }, (_, k) => k)
  const span = offsets[offsets.length - 1]
  const sets = []
  for (let low = stringCount - 1 - span; low >= 0; low--) sets.push(offsets.map((o) => low + o))
  return sets
}

const minFretOf = (notes) => Math.min(...notes.map((n) => n.fret))

/**
 * Voice a chord inversion on a set of adjacent strings (low to high).
 * Returns the lowest playable shape at or above `minFret` as [{ string, fret, pitch, interval }], or null.
 */
export const voiceInversion = (rootPc, intervals, tuning, strings, inversion, minFret = 0, drop = 'drop2') => {
  const order = inversionOrder(intervals.length, inversion, drop)
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
export const chordInversions = (rootPc, intervals, tuning, drop = 'drop2') =>
  stringSets(intervals.length, tuning.length, drop).map((strings) => {
    const shapes = []
    for (let inversion = 0; inversion < intervals.length; inversion++) {
      const notes = voiceInversion(rootPc, intervals, tuning, strings, inversion, 0, drop)
      if (notes) shapes.push({ inversion, notes })
    }
    shapes.sort((a, b) => minFretOf(a.notes) - minFretOf(b.notes))
    const first = shapes[0]
    const octave = first && voiceInversion(rootPc, intervals, tuning, strings, first.inversion, minFretOf(first.notes) + 1, drop)
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

const MAJOR_DEGREES = [0, 2, 4, 5, 7, 9, 11]
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
// Chord type from the 3rd, 5th (and 7th) above the root, plus how the Roman numeral is written.
const TRIAD_TYPES = { '4,7': ['maj', true, ''], '3,7': ['min', false, ''], '3,6': ['dim', false, '°'], '4,8': ['aug', true, '+'] }
const SEVENTH_TYPES = {
  '4,7,11': ['maj7', true, 'maj7'],
  '4,7,10': ['dom7', true, '7'],
  '3,7,10': ['min7', false, '7'],
  '3,6,10': ['m7b5', false, 'ø7'],
  '3,6,9': ['dim7', false, '°7'],
  '3,7,11': ['minMaj7', false, 'maj7'],
  '4,8,11': ['augMaj7', true, '+maj7'],
}

/**
 * The chords built on each degree of a seven-note scale in `key` (triads, or 7th chords with `sevenths`):
 * [{ numeral: 'bVII', name: 'G', type: 'maj', rootName, rootPc, intervals }]. Numerals are counted from the major
 * scale, so A minor reads i ii° bIII iv v bVI bVII. Short scales use their parent (A minor pentatonic → A minor).
 */
export const diatonicChords = (key, scaleId, sevenths = false) => {
  const id = sevenNoteScale(scaleId)
  const intervals = SCALES[id].intervals
  const { root, names } = spellNotes(key, intervals, true)
  const rootPc = noteToPc(root)
  return intervals.map((start, d) => {
    const above = (steps) => mod12(intervals[(d + steps) % 7] - start)
    const shape = (sevenths ? [2, 4, 6] : [2, 4]).map(above).join(',')
    const [type, upper, suffix] = (sevenths ? SEVENTH_TYPES : TRIAD_TYPES)[shape] ?? ['maj', true, '?']
    const shift = start - MAJOR_DEGREES[d]
    const accidental = shift < 0 ? '♭' : shift > 0 ? '♯' : ''
    const numeral = accidental + (upper ? ROMAN_NUMERALS[d] : ROMAN_NUMERALS[d].toLowerCase()) + suffix
    return { degree: d, numeral, type, rootName: names[d], rootPc: mod12(rootPc + start), name: names[d] + CHORDS[type].symbol, intervals: CHORDS[type].intervals }
  })
}
