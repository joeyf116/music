// The backing band's parts for one bar, worked out from the chart's chords. Pure functions (no audio),
// so they can be tested; band.js turns the notes into sound. Times and lengths are in beats.
import { mod12 } from './theory.js'

/*
 * Drum patterns, one bar of 4/4 (or 3/4 where a style says so). Each character is one grid step:
 * X accent, x normal, o soft, . rest. `steps` is steps per beat: 3 for swung triplet feels, 4 for
 * straight 16ths. Patterns longer than a bar alternate bars. Other meters reuse the 4/4 pattern beat by beat.
 */
export const STYLES = {
  swing: {
    name: 'Swing',
    tempo: 140,
    steps: 3,
    swing: true,
    bass: 'walking',
    comp: 'swing',
    drums: { ride: 'X..x.xX..x.x', hatFoot: '...x.....x..', kick: 'o..o..o..o..', snare: '........o...' },
  },
  ballad: {
    name: 'Ballad',
    tempo: 70,
    steps: 3,
    swing: true,
    bass: 'twoFeel',
    comp: 'pads',
    drums: { brush: 'x..x.xx..x.x', hatFoot: '...x.....x..', kick: 'o.....o.....' },
  },
  bossa: {
    name: 'Bossa Nova',
    tempo: 130,
    steps: 4,
    bass: 'bossa',
    comp: 'bossa',
    drums: { hat: 'xoxoxoxoxoxoxoxo', kick: 'x..xx..xx..xx..x', rim: 'x..x..x...x..x....x..x..x...x...' },
  },
  rock: {
    name: 'Rock',
    tempo: 110,
    steps: 4,
    bass: 'eighths',
    comp: 'eighths',
    drums: { hat: 'x.x.x.x.x.x.x.x.', kick: 'x.......x.x.....', snare: '....X.......X...' },
  },
  pop: {
    name: 'Pop',
    tempo: 100,
    steps: 4,
    bass: 'pop',
    comp: 'pop',
    drums: { hat: 'X.x.X.x.X.x.X.x.', kick: 'x.....x.x.......', snare: '....X.......X...' },
  },
  funk: {
    name: 'Funk',
    tempo: 96,
    steps: 4,
    bass: 'funk',
    comp: 'funk',
    drums: { hat: 'xoxoxoxoxoxoxoxo', kick: 'x..x......x..x..', snare: '....X..o.o..X..o' },
  },
  shuffle: {
    name: 'Blues Shuffle',
    tempo: 96,
    steps: 3,
    swing: true,
    bass: 'boogie',
    comp: 'shuffle',
    drums: { hat: 'x.xx.xx.xx.x', kick: 'x.....x.....', snare: '...X.....X..' },
  },
  waltz: {
    name: 'Jazz Waltz',
    tempo: 150,
    steps: 3,
    swing: true,
    bass: 'waltz',
    comp: 'waltz',
    drums: { ride: 'X..x.xx..', hatFoot: '...x..x..', kick: 'o........' },
  },
  country: {
    name: 'Country / Folk',
    tempo: 120,
    steps: 4,
    bass: 'rootFive',
    comp: 'strum',
    drums: { brush: 'xoxoXoxoxoxoXoxo', kick: 'x.......x.......', snare: '....x.......x...' },
  },
}

export const STYLE_IDS = Object.keys(STYLES)
const VELOCITY = { X: 1, x: 0.7, o: 0.35 }

/** Drum hits for bar number `barIndex`: [{ voice, time, velocity }]. */
export const drumHits = (style, beats, barIndex = 0) => {
  const { drums, steps } = STYLES[style] ?? STYLES.swing
  const hits = []
  for (const [voice, pattern] of Object.entries(drums)) {
    const native = pattern.length / steps
    // A pattern written for this meter (or a whole number of bars of it) is read straight through;
    // otherwise each beat of the bar takes the matching beat of the pattern's first bar.
    const whole = native % beats === 0
    const offset = whole ? (barIndex % (native / beats)) * beats : 0
    for (let b = 0; b < beats; b++) {
      const source = (whole ? offset + b : b % Math.min(native, 4)) * steps
      for (let s = 0; s < steps; s++) {
        const v = VELOCITY[pattern[source + s]]
        if (v) hits.push({ voice, time: b + s / steps, velocity: v })
      }
    }
  }
  return hits
}

// Offbeat eighths land two-thirds of the way through the beat in swung styles.
export const swingTime = (time, swing) => {
  if (!swing) return time
  const beat = Math.floor(time)
  return Math.abs(time - beat - 0.5) < 1e-6 ? beat + 2 / 3 : time
}

const BASS_LOW = 28 // E1
const BASS_HIGH = 50 // D3
const chordPcs = (chord) => [...new Set(chord.intervals.map((i) => mod12(chord.root + i)))]
const third = (chord) => chord.intervals.find((i) => i === 3 || i === 4 || i === 2 || i === 5) ?? 4
const seventh = (chord) => chord.intervals.find((i) => i === 10 || i === 11 || i === 9) ?? 10
const fifth = (chord) => chord.intervals.find((i) => i === 6 || i === 7 || i === 8) ?? 7
const nearest = (pc, from, low = BASS_LOW, high = BASS_HIGH) => {
  let best = null
  for (let p = low; p <= high; p++) if (mod12(p) === mod12(pc) && (best === null || Math.abs(p - from) < Math.abs(best - from))) best = p
  return best
}
const bassRoot = (chord) => BASS_LOW + mod12((chord.bass ?? chord.root) - BASS_LOW)
const degree = (chord, d) => {
  const root = bassRoot(chord)
  const offset = { R: 0, 3: third(chord), 5: fifth(chord), 6: 9, 7: seventh(chord), 8: 12 }[d]
  return d === 'R' ? root : BASS_LOW + mod12(chord.root - BASS_LOW) + offset
}

// Bass rhythms as [time, length, degree] over one 4-beat bar.
const BASS_PATTERNS = {
  twoFeel: [[0, 2, 'R'], [2, 2, '5']],
  bossa: [[0, 1.5, 'R'], [1.5, 0.5, 'R'], [2, 1.5, '5'], [3.5, 0.5, '5']],
  eighths: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((t) => [t, 0.45, 'R']),
  pop: [[0, 1.5, 'R'], [1.5, 1, 'R'], [2.5, 0.5, '5'], [3, 1, '8']],
  funk: [[0, 0.5, 'R'], [0.75, 0.25, '8'], [1.5, 0.25, 'R'], [2, 0.25, '7'], [2.5, 0.5, '5'], [3.25, 0.25, '8'], [3.5, 0.25, 'R']],
  boogie: [[0, 0.5, 'R'], [0.5, 0.5, '3'], [1, 0.5, '5'], [1.5, 0.5, '6'], [2, 0.5, '7'], [2.5, 0.5, '6'], [3, 0.5, '5'], [3.5, 0.5, '3']],
  waltz: [[0, 1, 'R'], [1, 1, '5'], [2, 1, '8']],
  rootFive: [[0, 1, 'R'], [1, 1, null], [2, 1, '5'], [3, 1, null]].filter((n) => n[2]),
}

// One beat of walking bass: a chord tone stepping on from the last note, or a half-step into the next chord.
const walkNote = (chord, prev, target, rand) => {
  if (target !== null) {
    const goal = nearest(target, prev)
    return goal + (rand() < 0.5 ? -1 : 1)
  }
  const options = chordPcs(chord)
    .flatMap((pc) => [nearest(pc, prev - 5), nearest(pc, prev + 5)])
    .filter((p) => p !== null && p !== prev && Math.abs(p - prev) <= 7)
  return options.length ? options[Math.floor(rand() * options.length)] : prev
}

/**
 * Bass notes for one bar: [{ time, length, pitch, velocity }]. `events` are the bar's chords, `next` the chord
 * after the bar, `state.last` the previous pitch (kept so walking lines connect bar to bar).
 */
export const bassNotes = (style, events, beats, next, state = {}, rand = Math.random) => {
  const kind = (STYLES[style] ?? STYLES.swing).bass
  const notes = []
  events.forEach((event, e) => {
    const { chord } = event
    if (!chord) return
    const end = event.beat + event.beats
    const following = events[e + 1]?.chord ?? next
    if (kind === 'walking') {
      let prev = state.last ?? bassRoot(chord)
      for (let b = 0; b < event.beats; b++) {
        const lastBeat = b === event.beats - 1 && event.beats > 1
        const pitch = b === 0 ? nearest(chord.bass ?? chord.root, prev) : walkNote(chord, prev, lastBeat && following ? following.bass ?? following.root : null, rand)
        notes.push({ time: event.beat + b, length: 0.95, pitch, velocity: b === 0 ? 0.9 : 0.75 })
        prev = pitch
      }
      state.last = prev
      return
    }
    // Patterned styles: take the notes that fall inside this chord's beats (shifting by the 4-beat pattern).
    const pattern = BASS_PATTERNS[kind] ?? BASS_PATTERNS.rootFive
    let placed = false
    for (let bar = 0; bar * 4 < beats; bar++) {
      for (const [t, length, d] of pattern) {
        const time = bar * 4 + t
        if (time < event.beat || time >= end || time >= beats) continue
        notes.push({ time, length: Math.min(length, end - time), pitch: time === event.beat ? bassRoot(chord) : degree(chord, d), velocity: time === event.beat ? 0.9 : 0.7 })
        placed = time === event.beat || placed
      }
    }
    if (!placed) notes.unshift({ time: event.beat, length: Math.min(1, event.beats), pitch: bassRoot(chord), velocity: 0.9 })
    state.last = notes.at(-1)?.pitch ?? state.last
  })
  return notes.sort((a, b) => a.time - b.time)
}

// Comping rhythms as [time, length] over one 4-beat bar; swing has a few to vary between bars.
const COMP_PATTERNS = {
  swing: [
    [[0, 0.6], [1.5, 0.4]],
    [[1, 0.4], [3, 0.4]],
    [[0.5, 0.4], [2, 0.8]],
    [[0, 0.4], [2.5, 0.4], [3.5, 0.4]],
  ],
  pads: [[[0, 4]]],
  bossa: [
    [[0, 1], [1.5, 1], [3, 0.5]],
    [[0.5, 1], [2, 1], [3.5, 0.5]],
  ],
  eighths: [[[0, 0.45], [0.5, 0.45], [1, 0.45], [1.5, 0.45], [2, 0.45], [2.5, 0.45], [3, 0.45], [3.5, 0.45]]],
  pop: [[[0, 1.5], [1.5, 1], [2.5, 1.5]]],
  funk: [[[0.5, 0.2], [1.75, 0.2], [2.5, 0.2], [3.25, 0.2]]],
  shuffle: [[[1, 0.3], [1.5, 0.3], [3, 0.3], [3.5, 0.3]]],
  waltz: [[[1, 0.5], [2, 0.5]], [[0.5, 0.4], [2, 0.6]]],
  strum: [[[0, 1], [1, 0.5], [1.5, 0.5], [2, 1], [3, 0.5], [3.5, 0.5]]],
}

/** Comping hits for one bar: [{ time, length, chord, velocity }]. Every chord gets at least one hit. */
export const compHits = (style, events, beats, barIndex = 0, rand = Math.random) => {
  const kind = (STYLES[style] ?? STYLES.swing).comp
  const options = COMP_PATTERNS[kind] ?? COMP_PATTERNS.pads
  const pattern = kind === 'swing' ? options[Math.floor(rand() * options.length)] : options[barIndex % options.length]
  const hits = []
  for (const event of events) {
    if (!event.chord) continue
    const end = event.beat + event.beats
    const inside = []
    for (let bar = 0; bar * 4 < beats; bar++)
      for (const [t, length] of pattern) {
        const time = bar * 4 + t
        if (time >= event.beat && time < end && time < beats) inside.push({ time, length: kind === 'pads' ? end - time : Math.min(length, end - time) })
      }
    if (!inside.length || (kind === 'pads' && inside[0].time > event.beat)) inside.unshift({ time: event.beat, length: kind === 'pads' ? event.beats : Math.min(0.8, event.beats) })
    inside.forEach((h) => hits.push({ ...h, chord: event.chord, velocity: kind === 'pads' ? 0.5 : 0.7 }))
  }
  return hits
}

const COMP_LOW = 52 // E3
const COMP_HIGH = 76 // E5
/**
 * A close piano voicing for `chord`, moved as little as possible from `previous` (an array of pitches).
 * Uses the 3rd, 7th and colour tones and leaves the root to the bass when the chord has four or more notes.
 */
export const voiceChord = (chord, previous = null) => {
  const tones = chord.intervals.map(mod12)
  let pcs = tones.length >= 4 ? tones.filter((i) => i !== 0) : tones
  // Too many colour tones gets muddy: keep 3rd, 7th and the two highest extensions.
  if (pcs.length > 4) pcs = [...pcs.filter((i) => [2, 3, 4, 5, 9, 10, 11].includes(i)).slice(0, 2), ...pcs.filter((i) => ![3, 4, 10, 11].includes(i)).slice(-2)]
  pcs = [...new Set(pcs.map((i) => mod12(chord.root + i)))]
  const centre = previous?.length ? previous.reduce((a, b) => a + b, 0) / previous.length : 62
  let best = null
  for (let r = 0; r < pcs.length; r++) {
    const order = [...pcs.slice(r), ...pcs.slice(0, r)]
    for (let base = COMP_LOW; base < COMP_LOW + 12; base++) {
      if (mod12(base) !== order[0]) continue
      const voicing = [base]
      for (const pc of order.slice(1)) voicing.push(voicing.at(-1) + mod12(pc - voicing.at(-1)))
      if (voicing.at(-1) > COMP_HIGH) continue
      const middle = voicing.reduce((a, b) => a + b, 0) / voicing.length
      const score = Math.abs(middle - centre) + (voicing.at(-1) - voicing[0]) * 0.05
      if (!best || score < best.score) best = { voicing, score }
    }
  }
  return best?.voicing ?? pcs.map((pc) => 60 + mod12(pc))
}
