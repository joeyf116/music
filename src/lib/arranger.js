// The backing band's parts for one bar, worked out from the chart's chords. Pure functions (no audio),
// so they can be tested; band.js turns the notes into sound. Times and lengths are in beats.
// Anything random takes a `rand` argument (Math.random by default) so tests can pin it.
import { mod12 } from './theory.js'

/*
 * Drum grooves, one bar of 4/4 (or 3/4 where a style says so). Each character is one grid step:
 * X accent, x normal, o soft, . rest. `steps` is steps per beat: 3 for swung triplet feels, 4 for
 * straight 16ths. Patterns longer than a bar alternate bars. Other meters reuse the 4/4 pattern beat by beat.
 * `fill` is the drummer's fill into a new section ([beat, voice, velocity], counted back from the bar's end)
 * and `crash` whether a crash marks the top of a section. `bass` is the bass line, `comp` the piano rhythm,
 * `voicing` how the piano spells chords and `bassSound` which bass plays.
 */
export const STYLES = {
  swing: {
    name: 'Swing',
    tempo: 140,
    steps: 3,
    swing: true,
    bass: 'walking',
    bassSound: 'upright',
    comp: 'swing',
    voicing: 'rootless',
    drums: { ride: 'x..X.xx..X.x', hatFoot: '...x.....x..', kick: 'o..o..o..o..' },
    chatter: { voice: 'ghost', chance: 0.45, steps: [2, 5, 8, 11] },
    fill: [[-2, 'ghost', 0.5], [-1.667, 'snare', 0.6], [-1.333, 'snare', 0.7], [-1, 'tomHigh', 0.8], [-0.667, 'tomLow', 0.85], [-0.333, 'snare', 0.9]],
    crash: true,
  },
  ballad: {
    name: 'Ballad',
    tempo: 70,
    steps: 3,
    swing: true,
    bass: 'twoFeel',
    bassSound: 'upright',
    comp: 'pads',
    voicing: 'rootless',
    drums: { ride: 'x..x.ox..x.o', hatFoot: '...x.....x..', kick: 'o.....o.....', rim: '.........x..' },
    fill: [[-0.667, 'ghost', 0.35], [-0.333, 'ghost', 0.45]],
    crash: false,
  },
  bossa: {
    name: 'Bossa Nova',
    tempo: 130,
    steps: 4,
    bass: 'bossa',
    bassSound: 'upright',
    comp: 'bossa',
    voicing: 'rootless',
    drums: { hat: 'x.o.x.o.x.o.x.o.', kick: 'o..xo..xo..xo..x', rim: 'x..x..x...x..x....x..x..x...x...' },
    fill: [],
    crash: false,
  },
  rock: {
    name: 'Rock',
    tempo: 110,
    steps: 4,
    bass: 'eighths',
    bassSound: 'electric',
    comp: 'rock',
    voicing: 'spread',
    drums: { hat: 'X.x.X.x.X.x.X.x.X.x.X.x.X.x.X.x.', kick: 'x.......x.x.....x.....x.x.x.....', snare: '....X.......X.......X.......X...' },
    fill: [[-2, 'snare', 0.8], [-1.75, 'snare', 0.6], [-1.5, 'snare', 0.8], [-1.25, 'snare', 0.7], [-1, 'tomHigh', 0.9], [-0.75, 'tomHigh', 0.8], [-0.5, 'tomLow', 0.95], [-0.25, 'tomLow', 0.85], [-1, 'kick', 0.8], [-0.5, 'kick', 0.8]],
    crash: true,
  },
  pop: {
    name: 'Pop',
    tempo: 100,
    steps: 4,
    bass: 'pop',
    bassSound: 'electric',
    comp: 'pop',
    voicing: 'spread',
    drums: { hat: 'X.x.X.x.X.x.X.x.', kick: 'x.....x.x.......', snare: '....X.......X...', ghost: '...............o' },
    fill: [[-1, 'snare', 0.7], [-0.75, 'snare', 0.55], [-0.5, 'tomHigh', 0.75], [-0.25, 'tomLow', 0.8]],
    crash: true,
  },
  funk: {
    name: 'Funk',
    tempo: 96,
    steps: 4,
    bass: 'funk',
    bassSound: 'electric',
    comp: 'funk',
    voicing: 'close',
    drums: { hat: 'xoxoxoxoxoxoxo.o', hatOpen: '..............x.', kick: 'x..x......x..x..', snare: '....X.......X...', ghost: '.......o.o.....o' },
    fill: [[-1, 'snare', 0.85], [-0.75, 'ghost', 0.5], [-0.5, 'snare', 0.8], [-0.25, 'tomLow', 0.9]],
    crash: true,
  },
  shuffle: {
    name: 'Blues Shuffle',
    tempo: 96,
    steps: 3,
    swing: true,
    bass: 'boogie',
    bassSound: 'upright',
    comp: 'shuffle',
    voicing: 'close',
    drums: { hat: 'x.xX.xx.xX.x', kick: 'x.....x.....', snare: '...X.....X..', ghost: '.......o....' },
    fill: [[-1, 'snare', 0.8], [-0.667, 'snare', 0.6], [-0.333, 'snare', 0.9]],
    crash: true,
  },
  waltz: {
    name: 'Jazz Waltz',
    tempo: 150,
    steps: 3,
    swing: true,
    bass: 'walking',
    bassSound: 'upright',
    comp: 'waltz',
    voicing: 'rootless',
    drums: { ride: 'x..X.xx..', hatFoot: '...x..x..', kick: 'o........' },
    chatter: { voice: 'ghost', chance: 0.35, steps: [2, 5, 8] },
    fill: [[-1, 'snare', 0.6], [-0.667, 'tomHigh', 0.7], [-0.333, 'tomLow', 0.8]],
    crash: true,
  },
  country: {
    name: 'Country / Folk',
    tempo: 120,
    steps: 4,
    bass: 'rootFive',
    bassSound: 'upright',
    comp: 'strum',
    voicing: 'spread',
    drums: { hat: 'x.o.x.o.x.o.x.o.', kick: 'x.......x.......', rim: '....x.......x...' },
    fill: [[-0.5, 'snare', 0.6], [-0.25, 'snare', 0.75]],
    crash: false,
  },
}

export const STYLE_IDS = Object.keys(STYLES)
const VELOCITY = { X: 1, x: 0.72, o: 0.38 }

/**
 * Drum hits for bar number `barIndex`: [{ voice, time, velocity }]. `fill` swaps the end of the bar for the
 * style's fill (the bar before a new section) and `crash` puts a crash on the downbeat (the first bar of one).
 */
export const drumHits = (style, beats, barIndex = 0, { fill = false, crash = false } = {}, rand = Math.random) => {
  const { drums, steps, chatter, ...feel } = STYLES[style] ?? STYLES.swing
  let hits = []
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
  // Jazz drummers "talk" on the snare: a soft comping note or two on the swung offbeats, never the same twice.
  if (chatter)
    for (let b = 0; b < beats; b++)
      for (const s of chatter.steps.filter((n) => Math.floor(n / steps) === b % 4))
        if (rand() < chatter.chance / chatter.steps.length) hits.push({ voice: chatter.voice, time: b + (s % steps) / steps, velocity: 0.3 + rand() * 0.25 })
  if (fill && feel.fill?.length) {
    const start = beats + Math.min(...feel.fill.map(([t]) => t)) - 1e-6
    hits = hits.filter((h) => h.time < start || h.voice === 'hatFoot')
    for (const [t, voice, velocity] of feel.fill) if (beats + t >= 0) hits.push({ voice, time: beats + t, velocity })
  }
  if (crash && feel.crash) {
    hits = hits.filter((h) => !(h.time === 0 && ['ride', 'hat', 'hatOpen'].includes(h.voice)))
    hits.push({ voice: 'crash', time: 0, velocity: 0.8 })
    if (!hits.some((h) => h.time === 0 && h.voice === 'kick')) hits.push({ voice: 'kick', time: 0, velocity: 0.8 })
  }
  return hits.sort((a, b) => a.time - b.time)
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
// The scale a bass player walks through over a chord: its own tones plus the steps between them.
const walkingScale = (chord) => {
  const tones = chord.intervals.map(mod12)
  const has = (i) => tones.includes(i)
  const steps = [has(1) ? 1 : 2, has(3) ? 3 : 4, has(6) ? 6 : has(8) && !has(7) ? 8 : 7, has(5) ? 5 : 5, has(10) ? 10 : has(11) ? 11 : has(9) ? 9 : 10, has(8) ? 8 : 9]
  return [...new Set([0, ...tones, ...steps].map((i) => mod12(chord.root + i)))]
}

// Bass rhythms as [time, length, degree, velocity?] over one 4-beat bar.
const BASS_PATTERNS = {
  twoFeel: [[0, 2, 'R'], [2, 2, '5']],
  bossa: [[0, 1.5, 'R'], [1.5, 0.5, 'R', 0.6], [2, 1.5, '5'], [3.5, 0.5, '5', 0.6]],
  eighths: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((t) => [t, 0.42, 'R', t % 1 ? 0.62 : 0.8]),
  pop: [[0, 1.4, 'R'], [1.5, 0.9, 'R', 0.6], [2.5, 0.45, '5', 0.65], [3, 0.9, '8', 0.7]],
  funk: [[0, 0.45, 'R'], [0.75, 0.2, '8', 0.75], [1.5, 0.2, 'R', 0.6], [2, 0.2, '7', 0.7], [2.5, 0.45, '5', 0.75], [3.25, 0.2, '8', 0.7], [3.5, 0.2, 'R', 0.55]],
  boogie: [[0, 0.6, 'R'], [0.667, 0.3, 'R', 0.5], [1, 0.6, '3'], [1.667, 0.3, '3', 0.5], [2, 0.6, '5'], [2.667, 0.3, '5', 0.5], [3, 0.6, '6'], [3.667, 0.3, '6', 0.5]],
  rootFive: [[0, 0.95, 'R'], [2, 0.95, '5']],
}

// The note a bass player uses to lead into `target` (a pitch): a half step from either side most often,
// otherwise the scale step above or the 5th below.
const approach = (target, prev, rand) => {
  const r = rand()
  const candidates = r < 0.7 ? [target - 1, target + 1] : r < 0.85 ? [target + 2, target - 2] : [target - 5, target + 7]
  const fits = candidates.filter((p) => p >= BASS_LOW && p <= BASS_HIGH + 2 && p !== prev)
  return fits.length ? fits.reduce((a, b) => (Math.abs(a - prev) <= Math.abs(b - prev) ? a : b)) : target - 1
}

// One beat of walking bass between chord changes: a scale or chord tone heading toward `goal`, mostly by step.
const walkStep = (chord, prev, goal, beatsLeft, rand) => {
  const scale = walkingScale(chord)
  const tones = chordPcs(chord)
  const direction = goal === null ? (prev > 40 ? -1 : 1) : Math.sign(goal - prev) || (rand() < 0.5 ? -1 : 1)
  const options = []
  for (let p = prev - 5; p <= prev + 5; p++) {
    if (p === prev || p < BASS_LOW || p > BASS_HIGH + 2 || !scale.includes(mod12(p))) continue
    let score = Math.abs(p - prev) <= 2 ? 3 : Math.abs(p - prev) <= 4 ? 2 : 1
    if (tones.includes(mod12(p))) score += 1.5
    if (Math.sign(p - prev) === direction) score += 2
    if (goal !== null && mod12(p) === mod12(goal)) score -= 2 // save the next chord's root for its downbeat
    // Don't overshoot: leave room to reach the goal in the beats that are left.
    if (goal !== null && Math.abs(goal - p) > 3 * beatsLeft + 2) score -= 3
    options.push([p, score + rand() * 1.5])
  }
  return options.length ? options.reduce((a, b) => (b[1] > a[1] ? b : a))[0] : prev
}

/**
 * Bass notes for one bar: [{ time, length, pitch, velocity }]. `events` are the bar's chords, `next` the chord
 * after the bar, `state.last` the previous pitch (kept so walking lines connect bar to bar).
 */
export const bassNotes = (style, events, beats, next, state = {}, rand = Math.random) => {
  const { bass: kind, swing } = STYLES[style] ?? STYLES.swing
  const notes = []
  events.forEach((event, e) => {
    const { chord } = event
    if (!chord) return
    const end = event.beat + event.beats
    const following = events[e + 1]?.chord ?? next
    if (kind === 'walking') {
      let prev = state.last ?? bassRoot(chord) + 7
      const first = nearest(chord.bass ?? chord.root, prev)
      const goal = following ? nearest(following.bass ?? following.root, first) : null
      for (let b = 0; b < event.beats; b++) {
        const lastBeat = b === event.beats - 1 && event.beats > 1
        const pitch = b === 0 ? first : lastBeat && goal !== null ? approach(goal, prev, rand) : walkStep(chord, prev, goal, event.beats - b, rand)
        notes.push({ time: event.beat + b, length: 1, pitch, velocity: b === 0 ? 0.85 : 0.72 + rand() * 0.08 })
        // Now and then a "skip" note: a quick ghosted repeat on the swung offbeat, as bassists do.
        if (b > 0 && swing && rand() < 0.08) notes.push({ time: event.beat + b - 1 / 3, length: 0.2, pitch: prev, velocity: 0.4 })
        prev = pitch
      }
      state.last = prev
      return
    }
    // Patterned styles: take the notes that fall inside this chord's beats (shifting by the 4-beat pattern).
    const pattern = BASS_PATTERNS[kind] ?? BASS_PATTERNS.rootFive
    let placed = false
    const chordNotes = []
    for (let bar = 0; bar * 4 < beats; bar++) {
      for (const [t, length, d, velocity = 0.75] of pattern) {
        const time = bar * 4 + t
        if (time < event.beat || time >= end || time >= beats) continue
        chordNotes.push({ time, length: Math.min(length, end - time), pitch: time === event.beat ? bassRoot(chord) : degree(chord, d), velocity: time === event.beat ? 0.88 : velocity })
        placed = time === event.beat || placed
      }
    }
    if (!placed) chordNotes.unshift({ time: event.beat, length: Math.min(1, event.beats), pitch: bassRoot(chord), velocity: 0.88 })
    // Lead into a new chord: the last note before the change steps to it, like a player would.
    const last = chordNotes.at(-1)
    const changing = following && (following.root !== chord.root || following.bass !== chord.bass)
    if (changing && chordNotes.length > 1 && last.time > event.beat && ['twoFeel', 'rootFive', 'pop', 'eighths'].includes(kind) && rand() < 0.6) {
      const before = chordNotes.at(-2).pitch
      last.pitch = approach(nearest(following.bass ?? following.root, before), before, rand)
    }
    notes.push(...chordNotes)
    state.last = notes.at(-1)?.pitch ?? state.last
  })
  return notes.sort((a, b) => a.time - b.time)
}

/*
 * Piano rhythms as [time, length, velocity?] over one 4-beat bar. Styles with several options pick one per bar
 * (swing at random, like a real comper; the others in turn). `pushes` styles may anticipate the next chord on
 * the last offbeat of the bar.
 */
const COMP_PATTERNS = {
  swing: [
    [[0, 0.5], [1.5, 0.4, 0.6]], // Charleston
    [[1, 0.35], [3, 0.35]], // 2 and 4
    [[0.5, 0.4], [2, 0.9]],
    [[0, 0.35], [2.5, 0.35, 0.65]],
    [[1.5, 0.5, 0.65], [3, 0.35]],
    [[0, 1.2, 0.6], [2.5, 0.4, 0.7]],
    [[1, 0.35, 0.6], [2.5, 0.6, 0.7]],
  ],
  pads: [[[0, 4, 0.5]]],
  bossa: [
    [[0, 1, 0.6], [1.5, 1, 0.55], [3, 0.5, 0.55]],
    [[0.5, 1, 0.55], [2, 1, 0.6], [3.5, 0.5, 0.55]],
  ],
  rock: [[[0, 0.9, 0.75], [1, 0.9, 0.6], [2, 0.9, 0.7], [3, 0.4, 0.6], [3.5, 0.45, 0.62]]],
  pop: [[[0, 1.4, 0.65], [1.5, 0.9, 0.55], [2.5, 1.4, 0.6]], [[0, 2, 0.62], [2, 1.4, 0.58], [3.5, 0.5, 0.55]]],
  funk: [[[0.5, 0.2, 0.7], [1.75, 0.2, 0.62], [2.5, 0.2, 0.7], [3.25, 0.2, 0.6]], [[0, 0.2, 0.7], [0.75, 0.2, 0.6], [2.5, 0.2, 0.7], [3.5, 0.2, 0.62]]],
  shuffle: [[[1, 0.3, 0.6], [1.667, 0.3, 0.5], [3, 0.3, 0.62], [3.667, 0.3, 0.5]]],
  waltz: [[[1, 0.5, 0.6], [2, 0.5, 0.55]], [[0.5, 0.4, 0.55], [2, 0.6, 0.6]], [[0, 0.8, 0.6], [1.5, 0.4, 0.55]]],
  strum: [[[0, 1, 0.62], [1, 0.5, 0.48], [1.5, 0.5, 0.52], [2, 1, 0.58], [3, 0.5, 0.48], [3.5, 0.5, 0.52]]],
}
const PUSHES = { swing: 0.3, waltz: 0.2, bossa: 0.15, pop: 0.2 }

/**
 * Comping hits for one bar: [{ time, length, chord, velocity }]. Every chord gets at least one hit, unless the
 * pianist already pushed it at the end of the bar before (`state.pushed`). `next` is the chord after this bar.
 */
export const compHits = (style, events, beats, barIndex = 0, rand = Math.random, next = null, state = {}) => {
  const kind = (STYLES[style] ?? STYLES.swing).comp
  const options = COMP_PATTERNS[kind] ?? COMP_PATTERNS.pads
  const pattern = kind === 'swing' ? options[Math.floor(rand() * options.length)] : options[barIndex % options.length]
  const pushedIn = state.pushed
  state.pushed = false
  const hits = []
  events.forEach((event, e) => {
    if (!event.chord) return
    const end = event.beat + event.beats
    const inside = []
    for (let bar = 0; bar * 4 < beats; bar++)
      for (const [t, length, velocity = 0.65] of pattern) {
        const time = bar * 4 + t
        if (time >= event.beat && time < end && time < beats) inside.push({ time, length: kind === 'pads' ? end - time : Math.min(length, end - time), velocity })
      }
    const pushed = pushedIn && e === 0 && event.beat === 0
    if (pushed) {
      // The chord already sounded on the last offbeat: let it ring through the downbeat.
      const later = inside.filter((h) => h.time >= 1)
      hits.push(...later.map((h) => ({ ...h, chord: event.chord })))
      return
    }
    if (!inside.length || (kind === 'pads' && inside[0].time > event.beat)) inside.unshift({ time: event.beat, length: kind === 'pads' ? event.beats : Math.min(0.8, event.beats), velocity: 0.6 })
    inside.forEach((h) => hits.push({ ...h, chord: event.chord }))
  })
  // Anticipate the next bar's chord on the "and" of the last beat.
  const lastEvent = events.at(-1)
  if (next && PUSHES[kind] && lastEvent?.chord && lastEvent.beats >= 2 && rand() < PUSHES[kind] && (next.root !== lastEvent.chord.root || next.quality !== lastEvent.chord.quality)) {
    const time = beats - 0.5
    const kept = hits.filter((h) => h.time < time - 0.6).map((h) => ({ ...h, length: Math.min(h.length, time - h.time) }))
    hits.length = 0
    hits.push(...kept, { time, length: 0.5, chord: next, velocity: 0.72 })
    state.pushed = true
  }
  return hits
}

const COMP_LOW = 52 // E3
const COMP_HIGH = 76 // E5

// Rootless jazz voicings: the 3rd and 7th plus colour tones (9th, 13th), with the root left to the bass.
const rootless = (chord) => {
  const tones = chord.intervals.map(mod12)
  const has = (i) => tones.includes(i)
  const third = has(4) ? 4 : has(3) ? 3 : null
  const sev = has(10) ? 10 : has(11) ? 11 : null
  if (third === null) return null // sus chords keep their written notes
  if (third === 3 && has(6)) return sev === 10 ? [3, 6, 10] : null // m7b5: b3, b5, b7; diminished as written
  if ([1, 3, 6, 8].some((i) => has(i) && i !== third)) return null // altered chords keep their alterations exactly
  if (sev === null) return has(9) ? [third, 9, 2, 7] : null // 6 chords: 3, 6, 9, 5; plain triads as written
  // Dominant 7ths get the 13th in place of the 5th.
  return [third, sev, 2, has(5) ? 5 : third === 4 && sev === 10 ? 9 : 7]
}

/**
 * A piano voicing for `chord`, moved as little as possible from `previous` (an array of pitches).
 * `close` (default): chord tones close together, leaving the root to the bass when the chord has four or more notes.
 * `rootless`: jazz voicings with 9ths and 13ths, sitting a little lower. `spread`: the whole chord in the
 * right hand with the root an octave or so below, as in pop and rock.
 */
export const voiceChord = (chord, previous = null, kind = 'close') => {
  const tones = chord.intervals.map(mod12)
  let pcs = kind === 'spread' ? tones.filter((i) => ![2, 5, 9].includes(i) || tones.length <= 4) : tones.length >= 4 ? tones.filter((i) => i !== 0) : tones
  if (kind === 'rootless') pcs = rootless(chord) ?? pcs
  // Too many colour tones gets muddy: keep 3rd, 7th and the two highest extensions.
  if (pcs.length > 4) pcs = [...pcs.filter((i) => [2, 3, 4, 5, 9, 10, 11].includes(i)).slice(0, 2), ...pcs.filter((i) => ![3, 4, 10, 11].includes(i)).slice(-2)]
  pcs = [...new Set(pcs.map((i) => mod12(chord.root + i)))]
  const low = kind === 'rootless' ? 50 : kind === 'spread' ? 55 : COMP_LOW
  const high = kind === 'rootless' ? 74 : COMP_HIGH
  const upper = previous?.filter((p) => p >= low - 3) ?? []
  const centre = upper.length ? upper.reduce((a, b) => a + b, 0) / upper.length : kind === 'rootless' ? 60 : 63
  let best = null
  for (let r = 0; r < pcs.length; r++) {
    const order = [...pcs.slice(r), ...pcs.slice(0, r)]
    for (let base = low; base < low + 12; base++) {
      if (mod12(base) !== order[0]) continue
      const voicing = [base]
      for (const pc of order.slice(1)) voicing.push(voicing.at(-1) + mod12(pc - voicing.at(-1)))
      if (voicing.at(-1) > high) continue
      const middle = voicing.reduce((a, b) => a + b, 0) / voicing.length
      const score = Math.abs(middle - centre) + (voicing.at(-1) - voicing[0]) * 0.05
      if (!best || score < best.score) best = { voicing, score }
    }
  }
  const hand = best?.voicing ?? pcs.map((pc) => 60 + mod12(pc))
  if (kind !== 'spread') return hand
  // Left hand: the root (or slash bass) in the octave below the right hand.
  const bass = chord.bass ?? chord.root
  const left = 43 + mod12(bass - 43)
  return [left, ...hand]
}
