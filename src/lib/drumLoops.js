// Drum loops: what a loop is, how its steps line up in time, and the drums it can use.
//
// A loop is `bars` bars (1 when left out) of `beats` beats, each beat split into `steps` steps (4 = 16th notes,
// 3 = triplets / 12/8, 2 = 8th notes). Each track is a string with one character per step:
//   '.' rest   'x' hit   'X' accent (harder)   'g' ghost note (very soft)
// Strings keep presets readable: 'x.x.x.x.x.x.x.x.' is eight 8th notes on a 16-step bar.

/** Every drum the editor knows, top to bottom as they are drawn (cymbals, hats, toms, snare, kick). */
export const DRUM_VOICES = [
  { id: 'crash', name: 'Crash', gm: 49 },
  { id: 'ride', name: 'Ride', gm: 51 },
  { id: 'rideBell', name: 'Ride bell', gm: 53 },
  { id: 'hihatOpen', name: 'Hi-hat (open)', short: 'Open hat', gm: 46 },
  { id: 'hihat', name: 'Hi-hat (closed)', short: 'Hi-hat', gm: 42 },
  { id: 'hihatPedal', name: 'Hi-hat (pedal)', short: 'Pedal hat', gm: 44 },
  { id: 'tomHigh', name: 'High tom', gm: 50 },
  { id: 'tomMid', name: 'Mid tom', gm: 47 },
  { id: 'tomLow', name: 'Low tom', gm: 45 },
  { id: 'tomFloor', name: 'Floor tom', gm: 41 },
  { id: 'sidestick', name: 'Side stick', gm: 37 },
  { id: 'rimshot', name: 'Rimshot', gm: 40 },
  { id: 'snare', name: 'Snare', gm: 38 },
  { id: 'kick', name: 'Kick', gm: 36 },
]

export const voiceById = (id) => DRUM_VOICES.find((v) => v.id === id)

/** A drum's name, or its short name where space is tight ("Open hat" for "Hi-hat (open)"). */
export const voiceName = (id, short) => {
  const v = voiceById(id)
  return (short && v.short) || v.name
}

/** A closed or pedal hi-hat cuts off a ringing open hi-hat, as on a real kit. */
export const CHOKES = { hihat: ['hihatOpen'], hihatPedal: ['hihatOpen'] }

/** How hard each kind of step is played (0-1), which also picks the recorded layer. */
export const LEVELS = { x: 0.72, X: 1, g: 0.3 }

export const LEVEL_NAMES = { x: 'hit', X: 'accent', g: 'ghost' }

export const barCount = (loop) => loop.bars ?? 1

export const stepsPerBar = (loop) => loop.beats * loop.steps

export const stepCount = (loop) => barCount(loop) * stepsPerBar(loop)

/** A drum's mix settings: volume 0-1, mute, solo (loop.mix holds only the drums that differ). */
export const trackMix = (loop, voice) => ({ volume: 1, mute: false, solo: false, ...loop.mix?.[voice] })

/** True when a drum should be heard: not muted, and soloed if anything is soloed. */
export function audible(loop, voice) {
  const mix = trackMix(loop, voice)
  if (mix.mute) return false
  const soloed = Object.keys(loop.tracks).some((v) => trackMix(loop, v).solo)
  return !soloed || mix.solo
}

/** The time signature a loop is written in: triplet grids read as compound time (12/8, 9/8). */
export const meterLabel = (loop) => (loop.steps === 3 ? `${loop.beats * 3}/8` : `${loop.beats}/4`)

/** Tracks in drawing order, each { voice, steps: string } padded or cut to the loop's length. */
export function loopTracks(loop) {
  const n = stepCount(loop)
  return DRUM_VOICES.filter((v) => loop.tracks[v.id] !== undefined).map((v) => ({
    voice: v.id,
    steps: loop.tracks[v.id].slice(0, n).padEnd(n, '.'),
  }))
}

/** Hits heard on one step, with mute and solo applied: [{ voice, level: 'x' | 'X' | 'g', velocity, volume }]. */
export function hitsAt(loop, step) {
  return loopTracks(loop)
    .filter((t) => t.steps[step] !== '.' && audible(loop, t.voice))
    .map((t) => ({ voice: t.voice, level: t.steps[step], velocity: LEVELS[t.steps[step]] ?? LEVELS.x, volume: trackMix(loop, t.voice).volume }))
}

/** Seconds per step at a tempo (the beat is a quarter note, or a dotted quarter in 12/8). */
export const stepSeconds = (loop, bpm) => 60 / bpm / loop.steps

/**
 * How late a step sounds because of swing, in seconds. Swing pushes every second 16th (or 8th on an 8th-note
 * grid) later: 0.5 is straight, 0.66 is a triplet shuffle, 0.75 is a dotted feel. Triplet grids don't swing.
 */
export function swingDelay(loop, bpm, swing, step) {
  if (!swing || swing <= 0.5 || loop.steps === 3 || step % 2 === 0) return 0
  return (swing - 0.5) * 2 * stepSeconds(loop, bpm)
}

/** Offsets of every step from the start of the bar, in seconds (used for drawing and exporting). */
export const stepOffsets = (loop, bpm, swing = loop.swing) =>
  Array.from({ length: stepCount(loop) }, (_, i) => i * stepSeconds(loop, bpm) + swingDelay(loop, bpm, swing, i))

export const barSeconds = (loop, bpm) => stepsPerBar(loop) * stepSeconds(loop, bpm)

export const loopSeconds = (loop, bpm) => stepCount(loop) * stepSeconds(loop, bpm)

/** The step's position as a drummer would count it: 1 e & a (16ths), 1 & (8ths), 1 trip let (triplets). */
export function countLabel(loop, step) {
  const bar = Math.floor(step / stepsPerBar(loop))
  const inBar = step % stepsPerBar(loop)
  const beat = Math.floor(inBar / loop.steps) + 1
  const sub = inBar % loop.steps
  const names = { 4: ['', 'e', '&', 'a'], 3: ['', 'trip', 'let'], 2: ['', '&'] }[loop.steps] ?? []
  const count = sub === 0 ? String(beat) : `${beat} ${names[sub] ?? sub + 1}`
  return barCount(loop) > 1 ? `bar ${bar + 1}, ${count}` : count
}

const STEP_CHARS = /^[.xXg]*$/

/** True when a loop is well formed (used by tests, and later to check saved or imported loops). */
export function isValidLoop(loop) {
  if (!loop || typeof loop !== 'object') return false
  if (![2, 3, 4].includes(loop.steps) || !Number.isInteger(loop.beats) || loop.beats < 1 || loop.beats > 7) return false
  if (!(loop.bpm >= 30 && loop.bpm <= 300)) return false
  if (loop.bars !== undefined && ![1, 2, 4].includes(loop.bars)) return false
  const ids = Object.keys(loop.tracks ?? {})
  return ids.length > 0 && ids.every((id) => voiceById(id) && STEP_CHARS.test(loop.tracks[id]) && loop.tracks[id].length === stepCount(loop))
}

/**
 * The parts the grid is drawn in: one bar per block, or half a bar on a phone when a bar has more than nine
 * steps, so every step stays big enough to hit with a thumb.
 */
export function gridSegments(loop, narrow) {
  const bar = stepsPerBar(loop)
  const beatsPer = narrow && bar > 9 ? Math.ceil(loop.beats / 2) : loop.beats
  const segments = []
  for (let b = 0; b < barCount(loop); b++) {
    for (let beat = 0; beat < loop.beats; beat += beatsPer) {
      const beats = Math.min(beatsPer, loop.beats - beat)
      segments.push({ bar: b, firstBeat: beat, start: b * bar + beat * loop.steps, beats })
    }
  }
  return segments
}
