// Practice exercise generators. Each builder returns a "score": timed events on a tick grid that the tab draws
// and the player schedules. 48 ticks make a whole note, so a quarter is 12 ticks, an 8th 6, a 16th 3 and a triplet 8th 4.
import {
  CHORDS,
  KEYS,
  NUM_FRETS,
  SCALES,
  chordVoicings,
  intervalName,
  mod12,
  noteToPc,
  pcName,
  scaleAcrossNeck,
  scalePosition,
  stringSets,
  usesFlats,
  voiceInversion,
} from './theory.js'

export const TICKS_PER_WHOLE = 48
const EIGHTH = 6

// `groups` are the beats that start a pulse (6/8 is felt in two, 7/8 as 2+2+3).
export const METERS = {
  '4/4': { beats: 4, unit: 4 },
  '3/4': { beats: 3, unit: 4 },
  '2/4': { beats: 2, unit: 4 },
  '5/4': { beats: 5, unit: 4, groups: [0, 3] },
  '6/8': { beats: 6, unit: 8, groups: [0, 3] },
  '7/8': { beats: 7, unit: 8, groups: [0, 2, 4] },
  '9/8': { beats: 9, unit: 8, groups: [0, 3, 6] },
  '12/8': { beats: 12, unit: 8, groups: [0, 3, 6, 9] },
}

export const RATES = {
  quarter: { name: 'Quarter notes', ticks: 12 },
  eighth: { name: '8th notes', ticks: 6 },
  triplet: { name: '8th-note triplets', ticks: 4 },
  sixteenth: { name: '16th notes', ticks: 3 },
}

export const meterInfo = (id) => {
  const meter = METERS[id] ?? METERS['4/4']
  const beatTicks = TICKS_PER_WHOLE / meter.unit
  const groups = meter.groups ?? (meter.unit === 8 ? [0] : Array.from({ length: meter.beats }, (_, i) => i))
  return { id: METERS[id] ? id : '4/4', ...meter, groups, beatTicks, barTicks: meter.beats * beatTicks }
}

// A rate that divides the bar evenly (triplets don't fit 7/8), falling back to 8ths.
export const rateTicks = (rateId, meter) => {
  const ticks = (RATES[rateId] ?? RATES.eighth).ticks
  return meter.barTicks % ticks === 0 ? ticks : EIGHTH
}

export const rateFits = (rateId, meter) => meter.barTicks % RATES[rateId].ticks === 0

// Counting syllables shown under the tab: beat numbers, with e-&-a between them.
const COUNTS = { 12: { 3: 'e', 4: '&', 6: '&', 8: 'a', 9: 'a' }, 6: { 3: '&' } }
export const countLabel = (tick, meter) => {
  const inBar = tick % meter.barTicks
  const offset = inBar % meter.beatTicks
  if (offset === 0) return String(inBar / meter.beatTicks + 1)
  return COUNTS[meter.beatTicks]?.[offset] ?? ''
}

const makeNote = (tuning, string, fret, refPc, refIntervals) => {
  const pitch = tuning[string] + fret
  const interval = mod12(pitch - refPc)
  return { string, fret, pitch, interval, degree: intervalName(interval, refIntervals) }
}

// Give a note a fret on the string that keeps it closest to the frets lo-hi.
export const placePitch = (pitch, tuning, lo, hi) => {
  let best = null
  tuning.forEach((open, string) => {
    const fret = pitch - open
    if (fret < 0 || fret > NUM_FRETS) return
    const cost = fret < lo ? lo - fret : fret > hi ? fret - hi : 0
    if (!best || cost < best.cost) best = { string, fret, cost }
  })
  return best && { string: best.string, fret: best.fret, pitch }
}

/**
 * Lay out a line of items (each { notes, heading?, label? }) one per `ticksForBar(bar)`, padding the last bar with rests.
 * The rate may change from bar to bar but must divide the bar.
 */
export const layoutLine = (items, meter, ticksForBar) => {
  const events = []
  let tick = 0
  const step = () => ticksForBar(Math.floor(tick / meter.barTicks))
  for (const item of items) {
    events.push({ ...item, tick })
    tick += step()
  }
  while (tick % meter.barTicks) {
    events.push({ notes: [], tick })
    tick += step()
  }
  return { events, totalTicks: tick }
}

// Add bar starts, counts and how long each event rings (until the next note) to a laid-out score.
export const finalize = ({ events, totalTicks }, meter, extra = {}) => {
  const sounding = events.filter((e) => e.notes.length)
  const first = sounding[0]?.tick ?? 0
  let next = totalTicks + first
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    e.ring = next - e.tick
    if (e.notes.length) next = e.tick
    e.barStart = e.tick % meter.barTicks === 0
    e.count = countLabel(e.tick, meter)
  }
  return { ...extra, meter, events, totalTicks, bars: totalTicks / meter.barTicks }
}

// ---- Sequences ----

export const SEQUENCES = {
  straight: { name: 'Straight up & down', pattern: [0] },
  threes: { name: 'Groups of 3', pattern: [0, 1, 2] },
  fours: { name: 'Groups of 4', pattern: [0, 1, 2, 3] },
  thirds: { name: 'In 3rds (skip a note)', pattern: [0, 2] },
  fourths: { name: 'In 4ths (skip two)', pattern: [0, 3] },
  sixths: { name: 'In 6ths', pattern: [0, 5] },
  threeUpOneBack: { name: '1-2-3-1 (up three, back one)', pattern: [0, 1, 2, 0] },
}

/** Indexes into an ascending note list: the pattern climbing step by step, then mirrored back down. */
export const sequenceIndices = (length, pattern) => {
  const span = Math.max(...pattern)
  const up = []
  for (let start = 0; start + span < length; start++) up.push(...pattern.map((p) => start + p))
  if (pattern.length === 1) return [...up, ...up.slice(1, -1).reverse()]
  return [...up, ...up.map((i) => length - 1 - i)]
}

export const CHROMATIC_PATTERNS = ['1234', '1324', '1243', '1423', '1342', '2143', '2413', '4321']

// ---- Chords & progressions ----

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// Chord suffixes understood in a progression. Roman numerals use their case for '' / '7' / '6' (vi = minor).
const SUFFIXES = {
  '': ['maj', 'min'],
  7: ['dom7', 'min7'],
  6: ['six', 'min6'],
  m: 'min',
  maj: 'maj',
  M: 'maj',
  maj7: ['maj7', 'minMaj7'],
  M7: ['maj7', 'minMaj7'],
  Δ: ['maj7', 'minMaj7'],
  Δ7: ['maj7', 'minMaj7'],
  m7: 'min7',
  'm(maj7)': 'minMaj7',
  mmaj7: 'minMaj7',
  m6: 'min6',
  '°': 'dim',
  o: 'dim',
  dim: 'dim',
  '°7': 'dim7',
  o7: 'dim7',
  dim7: 'dim7',
  ø: 'm7b5',
  ø7: 'm7b5',
  m7b5: 'm7b5',
  'm7♭5': 'm7b5',
  '+': 'aug',
  aug: 'aug',
  sus: 'sus4',
  sus2: 'sus2',
  sus4: 'sus4',
  add9: 'add9',
  9: 'dom9',
}

const ROMAN = /^([b#♭♯]?)(VII|VI|IV|V|III|II|I)(.*)$/i
const LETTER = /^([A-G])([#b♯♭]?)(.*)$/

// Parse one chord: a Roman numeral relative to the key (ii7, bVII, V7) or a chord name (Am, F#m7, Bbmaj7).
export const parseChord = (token, keyPc) => {
  const roman = token.match(ROMAN)
  if (roman) {
    const [, acc, numeral, suffix] = roman
    const upper = numeral === numeral.toUpperCase()
    const isLower = numeral === numeral.toLowerCase()
    if (!upper && !isLower) return null
    const entry = SUFFIXES[suffix]
    if (entry === undefined) return null
    const type = Array.isArray(entry) ? entry[upper ? 0 : 1] : entry
    const shift = acc === 'b' || acc === '♭' ? -1 : acc ? 1 : 0
    const degree = NUMERALS.indexOf(numeral.toUpperCase())
    // A flattened numeral (bVII) is spelled with flats, a sharpened one with sharps.
    return { rootPc: mod12(keyPc + MAJOR_STEPS[degree] + shift), type, numeral: true, flats: shift ? shift < 0 : undefined }
  }
  const letter = token.match(LETTER)
  if (letter) {
    const [, name, acc, suffix] = letter
    const entry = SUFFIXES[suffix]
    if (entry === undefined) return null
    const type = Array.isArray(entry) ? entry[0] : entry
    const shift = acc === 'b' || acc === '♭' ? -1 : acc ? 1 : 0
    return { rootPc: mod12(noteToPc(name) + shift), type, flats: shift < 0 ? true : shift > 0 ? false : undefined }
  }
  return null
}

// Triads become their 7th chords: the V (and bVII) gets a dominant 7th, other major chords a maj7.
const SEVENTHS = { maj: 'maj7', min: 'min7', dim: 'm7b5' }
const addSeventh = (chord, keyPc) => {
  if (!SEVENTHS[chord.type]) return chord
  const fromKey = mod12(chord.rootPc - keyPc)
  const type = chord.type === 'maj' && chord.numeral && (fromKey === 7 || fromKey === 10) ? 'dom7' : SEVENTHS[chord.type]
  return { ...chord, type }
}

/** Parse a progression such as "I V vi IV", "ii7 V7 Imaj7" or "Am F C G" in a key. Unknown chords are listed in `errors`. */
export const parseProgression = (text, key, { sevenths = false } = {}) => {
  const keyPc = noteToPc(key)
  const flats = usesFlats(key)
  const chords = []
  const errors = []
  for (const token of text.split(/[\s,|–—-]+/).filter(Boolean)) {
    let chord = parseChord(token, keyPc)
    if (!chord) {
      errors.push(token)
      continue
    }
    if (sevenths) chord = addSeventh(chord, keyPc)
    const def = CHORDS[chord.type]
    chords.push({ ...chord, intervals: def.intervals, name: `${pcName(chord.rootPc, chord.flats ?? flats)}${def.symbol}` })
  }
  return { chords, errors }
}

export const PROGRESSIONS = [
  { name: 'I–V–vi–IV (pop)', text: 'I V vi IV' },
  { name: 'I–vi–IV–V (’50s)', text: 'I vi IV V' },
  { name: 'I–IV–V–I', text: 'I IV V I' },
  { name: 'vi–IV–I–V', text: 'vi IV I V' },
  { name: 'Pachelbel’s Canon', text: 'I V vi iii IV I IV V' },
  { name: 'I–♭VII–IV–I (Mixolydian rock)', text: 'I bVII IV I' },
  { name: '12-bar blues', text: 'I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7' },
  { name: 'Quick-change blues', text: 'I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7' },
  { name: 'ii–V–I (jazz)', text: 'ii7 V7 Imaj7 Imaj7' },
  { name: 'I–vi–ii–V turnaround', text: 'Imaj7 vi7 ii7 V7' },
  { name: 'i–iv–V–i (minor)', text: 'i iv V i' },
  { name: 'i–♭VII–♭VI–♭VII (minor rock)', text: 'i bVII bVI bVII' },
  { name: 'i–♭VII–♭VI–V (Andalusian)', text: 'i bVII bVI V' },
  { name: 'i–♭VI–♭III–♭VII (epic minor)', text: 'i bVI bIII bVII' },
  { name: 'Minor ii–V–i', text: 'iiø7 V7 i i' },
]

// Where each chord tends to go in a key (tonic → pre-dominant → dominant → tonic).
const MOVES = {
  major: {
    I: ['ii', 'iii', 'IV', 'V', 'vi'],
    ii: ['V', 'IV', 'vii°'],
    iii: ['vi', 'IV'],
    IV: ['V', 'I', 'ii', 'vi'],
    V: ['I', 'vi', 'IV'],
    vi: ['ii', 'IV', 'V', 'iii'],
    'vii°': ['I', 'iii'],
  },
  minor: {
    i: ['iv', 'bVI', 'bVII', 'v', 'bIII', 'iiø'],
    iiø: ['V', 'v'],
    bIII: ['bVI', 'iv', 'bVII'],
    iv: ['V', 'bVII', 'i', 'v'],
    v: ['i', 'bVI', 'iv'],
    V: ['i', 'bVI'],
    bVI: ['bVII', 'iv', 'bIII', 'V'],
    bVII: ['i', 'bIII', 'bVI'],
  },
}

/** A random but functional progression that starts on the tonic and leads back to it when it loops. */
export const randomProgression = (mode = 'major', length = 4, random = Math.random) => {
  const moves = MOVES[mode] ?? MOVES.major
  const tonic = mode === 'minor' ? 'i' : 'I'
  const pick = (list) => list[Math.floor(random() * list.length)]
  let best = null
  for (let attempt = 0; attempt < 60; attempt++) {
    const chords = [tonic]
    while (chords.length < length) chords.push(pick(moves[chords.at(-1)]))
    best = chords
    if (moves[chords.at(-1)].includes(tonic) && new Set(chords).size > Math.min(3, length - 1)) break
  }
  return best.join(' ')
}

const voicingPosition = (notes) => {
  const fretted = notes.filter((n) => n.fret > 0).map((n) => n.fret)
  return fretted.length ? Math.min(...fretted) : 0
}

// Every playable voicing for a chord; falls back to a close voicing on adjacent strings if no full shape fits.
const chordShapes = (chord, tuning) => {
  const shapes = chordVoicings(chord.rootPc, chord.intervals, tuning, 8).map((v) => v.notes)
  if (shapes.length) return shapes
  const tones = chord.intervals.slice(0, 4)
  for (const strings of stringSets(tones.length, tuning.length).reverse()) {
    const notes = voiceInversion(chord.rootPc, tones, tuning, strings, 0)
    if (notes) return [notes]
  }
  return [[]]
}

export const NECK_AREAS = {
  open: { name: 'Open position', fret: 0 },
  middle: { name: 'Around fret 5', fret: 5 },
  high: { name: 'Around fret 8', fret: 8 },
}

/** Pick one voicing per chord: the first near the chosen part of the neck, the rest as close as possible to the last. */
export const voiceProgression = (chords, tuning, area = 'open') => {
  const target = (NECK_AREAS[area] ?? NECK_AREAS.open).fret
  let previous = target
  return chords.map((chord) => {
    const shapes = chordShapes(chord, tuning)
    let best = shapes[0]
    let bestCost = Infinity
    for (const notes of shapes) {
      const pos = voicingPosition(notes)
      const cost = Math.abs(pos - previous) + 0.5 * Math.abs(pos - target) - notes.length * 0.1
      if (cost < bestCost) {
        best = notes
        bestCost = cost
      }
    }
    previous = voicingPosition(best)
    return best.map((n) => {
      const interval = mod12(n.pitch - chord.rootPc)
      return { string: n.string, fret: n.fret, pitch: n.pitch, interval, degree: intervalName(interval, chord.intervals) }
    })
  })
}

// Strum patterns on an 8th-note grid. D = down, U = up, - = let it ring.
export const STRUMS = {
  whole: { name: 'One strum per bar' },
  pulse: { name: 'On the beat' },
  eighths: { name: 'Straight 8ths (D U D U)' },
  folk: { name: 'Folk (D – D U – U D U)' },
  offbeat: { name: 'Off-beat skank (– U – U)' },
}

const FOLK = { '4/4': 'D-DU-UDU', '3/4': 'D-DUDU', '2/4': 'D-DU', '6/8': 'D-UD-U', '12/8': 'D-UD-UD-UD-U', '9/8': 'D-UD-UD-U' }

const strumAt = (style, step, meter) => {
  const eighthsPerBeat = meter.beatTicks / EIGHTH
  const beat = Math.floor(step / eighthsPerBeat)
  const onBeat = step % eighthsPerBeat === 0
  const pulse = onBeat && meter.groups.includes(beat)
  if (style === 'whole') return step === 0 ? 'D' : '-'
  if (style === 'pulse') return pulse ? 'D' : '-'
  if (style === 'offbeat') return meter.unit === 4 ? (onBeat ? '-' : 'U') : pulse ? '-' : 'U'
  if (style === 'folk' && FOLK[meter.id]) return FOLK[meter.id][step]
  return step % 2 === 0 ? 'D' : 'U'
}

// Fingerstyle patterns. B = bass, A = alternate bass, i/m/a = the three treble strings (low to high), "B+a" = pinch.
export const PICKING = {
  travis: { name: 'Travis (alternating bass)', travis: true },
  travisPinch: { name: 'Travis with pinch on 1', travis: true, pinch: true },
  pima: { name: 'p-i-m-a-m-i (arpeggio)', steps: ['B', 'i', 'm', 'a', 'm', 'i'] },
  pimi: { name: 'p-i-m-i with alternating bass', steps: ['B', 'i', 'm', 'i', 'A', 'i', 'm', 'i'] },
  pami: { name: 'p-a-m-i (descending)', steps: ['B', 'a', 'm', 'i'] },
  pinch: { name: 'Pinch & roll (p+a, i, m, i)', steps: ['B+a', 'i', 'm', 'i', 'A', 'i', 'm', 'i'] },
}

// Bass, alternate bass and treble notes (i, m, a) of a voicing.
const pickingVoices = (notes, stringCount) => {
  const sorted = [...notes].sort((a, b) => a.string - b.string)
  const bass = sorted[0]
  if (!bass) return null
  const alt = sorted.find((n) => n.string === bass.string + (bass.string === 0 ? 2 : 1)) ?? sorted[1] ?? bass
  let treble = sorted.filter((n) => n.string > alt.string && n.string >= stringCount - 3)
  if (!treble.length) treble = sorted.filter((n) => n.string > alt.string)
  if (!treble.length) treble = [sorted.at(-1)]
  const t = (k) => treble[Math.min(k, treble.length - 1)]
  return { B: bass, A: alt, i: t(0), m: t(1), a: t(2) }
}

// The tokens (see PICKING) to play `j` 8ths after a chord change.
export const pickTokens = (patternId, j) => {
  const pattern = PICKING[patternId] ?? PICKING.travis
  if (pattern.travis) {
    // Thumb alternates bass notes on the beat; fingers fill the off-beats.
    if (j % 2 === 0) {
      const thumb = (j / 2) % 2 === 0 ? 'B' : 'A'
      return pattern.pinch && j % 8 === 0 ? [thumb, 'a'] : [thumb]
    }
    return [['m', 'i', 'm', 'a'][((j - 1) / 2) % 4]]
  }
  return pattern.steps[j % pattern.steps.length].split('+')
}
const FINGER_NAMES = { B: 'p', A: 'p', i: 'i', m: 'm', a: 'a' }

export const CHORD_LENGTHS = {
  2: { name: '2 bars each' },
  1: { name: '1 bar each' },
  0.5: { name: '2 per bar' },
}

const buildProgression = (s, tuning, meter, style) => {
  const { chords, errors } = parseProgression(s.progression, s.key, { sevenths: s.sevenths })
  if (!chords.length) return { ...finalize({ events: [], totalTicks: 0 }, meter), errors }
  const voicings = voiceProgression(chords, tuning, s.neck)
  const length = Number(s.chordLength) === 0.5 && (meter.barTicks / 2) % EIGHTH === 0 ? 0.5 : Number(s.chordLength) || 1
  const chordTicks = meter.barTicks * length
  const totalTicks = Math.ceil((chords.length * chordTicks) / meter.barTicks) * meter.barTicks
  const events = []
  for (let tick = 0; tick < totalTicks; tick += EIGHTH) {
    const index = Math.floor(tick / chordTicks)
    const chord = chords[index]
    const voicing = voicings[index]
    const j = (tick - index * chordTicks) / EIGHTH
    const event = { tick, notes: [], heading: j === 0 && chord ? chord.name : undefined, shape: voicing }
    if (chord && voicing.length) {
      if (style === 'strum') {
        const step = (tick % meter.barTicks) / EIGHTH
        let stroke = strumAt(s.strum, step, meter)
        if (j === 0 && stroke === '-') stroke = 'D'
        if (stroke !== '-') {
          // Up-strokes catch the treble strings; down-strokes the whole chord.
          const top = Math.max(...voicing.map((n) => n.string))
          event.notes = stroke === 'D' ? voicing : voicing.filter((n) => n.string > top - 4)
          event.strum = stroke === 'D' ? 'down' : 'up'
          event.label = stroke === 'D' ? '↓' : '↑'
        }
      } else {
        const voices = pickingVoices(voicing, tuning.length)
        const tokens = pickTokens(s.picking, j)
        event.notes = [...new Map(tokens.map((t) => [voices[t].string, voices[t]])).values()]
        event.label = tokens.map((t) => FINGER_NAMES[t]).join('+')
      }
    }
    events.push(event)
  }
  return { ...finalize({ events, totalTicks }, meter, { chords }), errors }
}

// ---- Melodic exercises ----

const sevenNoteScale = (id) => (SCALES[id]?.intervals.length === 7 ? SCALES[id] : SCALES.major)

// Stack thirds on a scale degree: [0, 3rd, 5th(, 7th)] in semitones above that degree.
export const diatonicChord = (intervals, degree, size) =>
  Array.from({ length: size }, (_, k) => mod12(intervals[(degree + 2 * k) % intervals.length] - intervals[degree]))

export const chordSymbol = (intervals) => {
  const match = Object.values(CHORDS).find((c) => c.intervals.join() === intervals.join())
  return match ? match.symbol : ''
}

const withDegree = (n, refPc, refIntervals) => {
  const interval = mod12(n.pitch - refPc)
  return { string: n.string, fret: n.fret, pitch: n.pitch, interval, degree: intervalName(interval, refIntervals) }
}

// How a scale or arpeggio is fingered: a box that stays in one position, or a diagonal run that starts in that
// box and shifts up through the next positions. Positions are numbered the usual way (Position 1 = the shape
// starting on the root on the low string), and both fingerings share that numbering.
export const LAYOUTS = {
  position: { name: 'Box', title: 'Stay in one position', shape: scalePosition },
  across: { name: 'Diagonal', title: 'Start in the position and shift up the neck through the next ones', shape: scaleAcrossNeck },
}

export const layoutShape = (layout, rootPc, intervals, tuning, degree) => (LAYOUTS[layout] ?? LAYOUTS.position).shape(rootPc, intervals, tuning, degree)

const scaleNotes = (s, tuning) => {
  const scale = SCALES[s.scale] ?? SCALES.major
  const rootPc = noteToPc(s.key)
  const position = Math.min(s.position, scale.intervals.length - 1)
  const notes = layoutShape(s.layout, rootPc, scale.intervals, tuning, position).map((n) => withDegree(n, rootPc, scale.intervals))
  return { scale, rootPc, notes }
}

const single = (n, extra) => ({ notes: n ? [n] : [], ...extra })

const BUILDERS = {
  scaleSequence(s, tuning, meter) {
    const { notes } = scaleNotes(s, tuning)
    const seq = SEQUENCES[s.sequence] ?? SEQUENCES.straight
    const items = sequenceIndices(notes.length, seq.pattern).map((i) => single(notes[i]))
    const ticks = rateTicks(s.rate, meter)
    return finalize(layoutLine(items, meter, () => ticks), meter)
  },

  scaleString(s, tuning, meter) {
    const scale = SCALES[s.scale] ?? SCALES.major
    const rootPc = noteToPc(s.key)
    const string = Math.min(s.string, tuning.length - 1)
    const start = mod12(rootPc - tuning[string])
    const steps = [...scale.intervals, 12].filter((i) => start + i <= NUM_FRETS)
    const up = steps.map((i) => makeNote(tuning, string, start + i, rootPc, scale.intervals))
    const items = [...up, ...up.slice(1, -1).reverse()].map((n) => single(n))
    const ticks = rateTicks(s.rate, meter)
    return finalize(layoutLine(items, meter, () => ticks), meter)
  },

  ladder(s, tuning, meter) {
    const { notes } = scaleNotes(s, tuning)
    const line = sequenceIndices(notes.length, [0]).map((i) => notes[i])
    const rates = ['quarter', 'eighth', 'triplet', 'sixteenth'].filter((r) => rateFits(r, meter)).map((r) => RATES[r].ticks)
    const items = []
    rates.forEach((ticks) => {
      const name = Object.values(RATES).find((r) => r.ticks === ticks).name
      for (let t = 0; t < meter.barTicks; t += ticks) items.push(single(line[items.length % line.length], { heading: t === 0 ? name : undefined }))
    })
    return finalize(layoutLine(items, meter, (bar) => rates[bar % rates.length]), meter)
  },

  chromatic(s, tuning, meter) {
    const pattern = CHROMATIC_PATTERNS.includes(s.fingers) ? s.fingers : '1234'
    const start = Math.max(1, Math.min(NUM_FRETS - 3, Number(s.startFret) || 1))
    const fingers = [...pattern].map(Number)
    const strings = tuning.map((_, i) => i)
    const items = []
    const add = (string, finger) => {
      const n = makeNote(tuning, string, start + finger - 1, tuning[0], [])
      items.push(single({ ...n, degree: String(finger) }))
    }
    strings.forEach((string) => fingers.forEach((f) => add(string, f)))
    ;[...strings].reverse().forEach((string) => [...fingers].reverse().forEach((f) => add(string, f)))
    const ticks = rateTicks(s.rate, meter)
    return finalize(layoutLine(items, meter, () => ticks), meter)
  },

  diatonicArpeggios(s, tuning, meter) {
    const scale = sevenNoteScale(s.scale)
    const rootPc = noteToPc(s.key)
    const flats = usesFlats(s.key)
    const position = Math.min(s.position, 6)
    const shape = scalePosition(rootPc, scale.intervals, tuning, position)
    const frets = shape.map((n) => n.fret)
    const lo = Math.min(...frets)
    const hi = Math.max(...frets)
    const byPitch = new Map(shape.map((n) => [n.pitch, n]))
    const size = s.arpSize === 'triads' ? 3 : 4
    const items = []
    ;[0, 1, 2, 3, 4, 5, 6, 0].forEach((degree, k) => {
      const chordRoot = mod12(rootPc + scale.intervals[degree])
      const tones = diatonicChord(scale.intervals, degree, size)
      const rootPitch = shape.find((n) => mod12(n.pitch) === chordRoot)?.pitch
      if (rootPitch === undefined) return
      let order = size === 3 ? [...tones, 12] : tones
      if (s.arpDirection === 'updown') order = [...order, ...order.slice(1, -1).reverse()]
      if (s.arpDirection === 'alternate' && k % 2 === 1) order = [...order].reverse()
      const name = `${pcName(chordRoot, flats)}${chordSymbol(tones)}`
      order.forEach((semis, i) => {
        const pitch = rootPitch + semis
        const placed = byPitch.get(pitch) ?? placePitch(pitch, tuning, lo, hi)
        items.push(single(placed && withDegree(placed, chordRoot, tones), { heading: i === 0 ? name : undefined }))
      })
    })
    const ticks = rateTicks(s.rate, meter)
    return finalize(layoutLine(items, meter, () => ticks), meter)
  },

  chordArpeggio(s, tuning, meter) {
    const chord = CHORDS[s.chord] ?? CHORDS.maj7
    const rootPc = noteToPc(s.key)
    const position = Math.min(s.position, chord.intervals.length - 1)
    const notes = layoutShape(s.layout, rootPc, chord.intervals, tuning, position).map((n) => withDegree(n, rootPc, chord.intervals))
    const name = `${s.key}${chord.symbol}`
    const items = sequenceIndices(notes.length, [0]).map((i, k) => single(notes[i], { heading: k === 0 ? name : undefined }))
    const ticks = rateTicks(s.rate, meter)
    return finalize(layoutLine(items, meter, () => ticks), meter)
  },

  triadSets(s, tuning, meter) {
    const scale = sevenNoteScale(s.scale)
    const rootPc = noteToPc(s.key)
    const flats = usesFlats(s.key)
    const sets = stringSets(3, tuning.length)
    const strings = sets[Math.min(s.stringSet, sets.length - 1)]
    const items = []
    let minFret = 0
    for (const degree of [0, 1, 2, 3, 4, 5, 6, 0]) {
      const chordRoot = mod12(rootPc + scale.intervals[degree])
      const tones = diatonicChord(scale.intervals, degree, 3)
      const inversion = Math.min(s.inversion, 2)
      // Climb the neck; if the next shape would run off the top, drop back down an octave.
      const shape = voiceInversion(chordRoot, tones, tuning, strings, inversion, minFret) ?? voiceInversion(chordRoot, tones, tuning, strings, inversion, 0)
      if (!shape) break
      minFret = Math.min(...shape.map((n) => n.fret))
      const notes = shape.map((n) => withDegree(n, chordRoot, tones))
      const heading = `${pcName(chordRoot, flats)}${chordSymbol(tones)}`
      if (s.triadStyle === 'block') items.push({ notes, heading })
      else [0, 1, 2, 1].forEach((i, k) => items.push(single(notes[i], { heading: k === 0 ? heading : undefined })))
    }
    const ticks = rateTicks(s.rate, meter)
    return finalize(layoutLine(items, meter, () => ticks), meter)
  },

  progression: (s, tuning, meter) => buildProgression(s, tuning, meter, 'strum'),
  fingerstyle: (s, tuning, meter) => buildProgression(s, tuning, meter, 'pick'),
}

// Which settings each exercise uses (the page shows just these controls).
export const EXERCISES = [
  {
    id: 'scaleSequence',
    group: 'Scales',
    name: 'Scale sequences',
    controls: ['key', 'scale', 'layout', 'position', 'sequence', 'rate'],
    about: 'Playing a scale in groups and intervals breaks the straight up-and-down habit, builds picking control across strings and gives you ready-made melodic phrases.',
  },
  {
    id: 'scaleString',
    group: 'Scales',
    name: 'Scale on one string',
    controls: ['key', 'scale', 'string', 'rate'],
    about: 'Running a scale along a single string shows its whole and half steps and links the box shapes together horizontally.',
  },
  {
    id: 'ladder',
    group: 'Technique',
    name: 'Subdivision ladder',
    controls: ['key', 'scale', 'layout', 'position'],
    about: 'One bar each of quarters, 8ths, triplets and 16ths at the same tempo. Switching cleanly between subdivisions is the quickest way to tighten your timing.',
  },
  {
    id: 'chromatic',
    group: 'Technique',
    name: 'Chromatic finger workout',
    controls: ['fingers', 'startFret', 'rate'],
    about: 'One finger per fret across all strings (the "spider"). Builds finger independence and keeps both hands in sync. Change the finger order so it never gets automatic.',
  },
  {
    id: 'diatonicArpeggios',
    group: 'Arpeggios',
    name: 'Arpeggios through the key',
    controls: ['key', 'scale7', 'position', 'arpSize', 'arpDirection', 'rate'],
    about: 'Arpeggiate every chord in the key inside one scale position, so you see the chord tones within the scale. This is the core skill for soloing over chord changes.',
  },
  {
    id: 'chordArpeggio',
    group: 'Arpeggios',
    name: 'Chord arpeggio shapes',
    controls: ['key', 'chord', 'layout', 'position', 'rate'],
    about: 'One chord type in each of its shapes up the neck. Learn where the root, 3rd, 5th and 7th sit in every position.',
  },
  {
    id: 'triadSets',
    group: 'Arpeggios',
    name: 'Triads on a string set',
    controls: ['key', 'scale7', 'stringSet', 'inversion', 'triadStyle', 'rate'],
    about: 'Harmonise the scale with triads on three adjacent strings and climb the neck in one inversion, which maps every chord in the key across the fretboard.',
  },
  {
    id: 'progression',
    group: 'Chords & rhythm',
    name: 'Chord progressions',
    controls: ['key', 'progression', 'sevenths', 'chordLength', 'neck', 'strum'],
    about: 'Common progressions (or your own, or a random one) with a strum pattern. Aim for clean changes in time; voicings are picked to stay close together on the neck.',
  },
  {
    id: 'fingerstyle',
    group: 'Fingerstyle',
    name: 'Travis & fingerpicking',
    controls: ['key', 'progression', 'sevenths', 'chordLength', 'neck', 'picking'],
    about: 'Travis picking keeps the thumb alternating bass notes on the beat while the fingers pick the off-beats. The arpeggio patterns build right-hand independence.',
  },
]

export const DEFAULT_SETTINGS = {
  exercise: 'scaleSequence',
  key: 'A',
  scale: 'minorPentatonic',
  scale7: 'major',
  position: 0,
  layout: 'position',
  sequence: 'threes',
  rate: 'eighth',
  meter: '4/4',
  string: 5,
  fingers: '1234',
  startFret: 5,
  arpSize: 'sevenths',
  arpDirection: 'up',
  chord: 'maj7',
  stringSet: 0,
  inversion: 0,
  triadStyle: 'arpeggio',
  progression: 'I V vi IV',
  sevenths: false,
  chordLength: 1,
  neck: 'open',
  strum: 'folk',
  picking: 'travis',
}

/** Build the score for the chosen exercise and settings in a tuning. */
export const buildExercise = (settings, tuning) => {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  if (!KEYS.includes(s.key)) s.key = 'C'
  const exercise = EXERCISES.find((e) => e.id === s.exercise) ?? EXERCISES[0]
  // Exercises that harmonise a scale need a seven-note scale; they keep their own choice.
  const scaleSettings = exercise.controls.includes('scale7') ? { ...s, scale: s.scale7 } : s
  const meter = meterInfo(s.meter)
  return { exercise, settings: s, errors: [], ...BUILDERS[exercise.id](scaleSettings, tuning, meter) }
}
