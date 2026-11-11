// Metronome maths: meters, subdivisions, accents, the gap and speed trainers, tap tempo and tempo names.
// Everything here is plain data and maths so it can be tested; audio lives in rhythmEngine.js.
import { meterInfo } from './exercises.js'

// ---- Metronome ----

export const METRONOME_METERS = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8']

/**
 * Ways to split each counted beat. `offsets` are fractions of a beat; `counts` are what you say out loud on each.
 * Swing plays the 1st and 3rd notes of a triplet, which is how swung 8ths are felt.
 */
export const SUBDIVISIONS = [
  { id: 'beats', name: 'Beats only', short: '1', offsets: [0], counts: [''] },
  { id: 'eighths', name: '8th notes', short: '1 &', offsets: [0, 1 / 2], counts: ['', '&'] },
  { id: 'triplets', name: 'Triplets', short: '1 trip let', offsets: [0, 1 / 3, 2 / 3], counts: ['', 'trip', 'let'] },
  { id: 'sixteenths', name: '16th notes', short: '1 e & a', offsets: [0, 1 / 4, 1 / 2, 3 / 4], counts: ['', 'e', '&', 'a'] },
  { id: 'swing', name: 'Swing 8ths', short: '1 . a', offsets: [0, 2 / 3], counts: ['', 'a'] },
  { id: 'quintuplets', name: 'Quintuplets', short: '5', offsets: [0, 1 / 5, 2 / 5, 3 / 5, 4 / 5], counts: ['', '2', '3', '4', '5'] },
  { id: 'sextuplets', name: 'Sextuplets', short: '6', offsets: [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6], counts: ['', 'la', 'li', '&', 'la', 'li'] },
]

export const subdivisionById = (id) => SUBDIVISIONS.find((s) => s.id === id) ?? SUBDIVISIONS[0]

/** Accent levels a beat can be set to, in the order a tap cycles through them. */
export const ACCENT_CYCLE = ['accent', 'beat', 'mute']

// The first beat is accented; in grouped meters (6/8, 7/8…) the start of each group is too, more softly.
export const defaultAccents = (meterId) => {
  const meter = meterInfo(meterId)
  return Array.from({ length: meter.beats }, (_, i) => (i === 0 ? 'accent' : meter.unit === 8 && meter.groups.includes(i) ? 'accent' : 'beat'))
}

/** Accents sized to the meter, keeping what fits from a saved list. */
export const fitAccents = (accents, meterId) => {
  const fallback = defaultAccents(meterId)
  if (!Array.isArray(accents) || accents.length !== fallback.length) return fallback
  return accents.map((a, i) => (ACCENT_CYCLE.includes(a) ? a : fallback[i]))
}

export const nextAccent = (level) => ACCENT_CYCLE[(ACCENT_CYCLE.indexOf(level) + 1) % ACCENT_CYCLE.length]

/**
 * Every click in one bar, in order: { beat, sub, at (in beats from the bar start), level }.
 * A muted beat silences just that beat's main click, so you can practise hearing only the "&"s, or 2 and 4.
 */
export const barPulses = (accents, subdivisionId) => {
  const sub = subdivisionById(subdivisionId)
  return accents.flatMap((level, beat) => sub.offsets.map((offset, k) => ({ beat, sub: k, at: beat + offset, level: k === 0 ? level : 'sub' })))
}

/** Gap click: play `play` bars, then the click drops out for `mute` bars, and repeat. */
export const barAudible = (bar, gap) => {
  if (!gap?.on || !gap.mute) return true
  const cycle = gap.play + gap.mute
  return bar % cycle < gap.play
}

/** Speed trainer: start at `bpm`, add `step` every `every` bars, never past `max`. */
export const tempoAtBar = (bar, bpm, speed) => {
  if (!speed?.on || !speed.step || !speed.every) return bpm
  return Math.min(Math.max(bpm, speed.max), bpm + speed.step * Math.floor(bar / speed.every))
}

/** Where the gap trainer is up to, in words. */
export const gapStatus = (bar, gap) => {
  if (!gap.on || bar < 0) return ''
  const cycle = gap.play + gap.mute
  const at = bar % cycle
  if (at < gap.play) return gap.play - at === 1 ? 'Last bar before the gap' : `Click on · ${gap.play - at} bars`
  const left = cycle - at
  return `Silent: keep counting · ${left} ${left === 1 ? 'bar' : 'bars'} left`
}

export const clampBpm = (bpm, min = 30, max = 300) => Math.max(min, Math.min(max, Math.round(Number(bpm) || 100)))

/**
 * Tap tempo from the last few tap times (seconds). Taps more than two seconds apart start over.
 * Returns null until there are two taps.
 */
export const tapTempo = (times) => {
  let start = times.length - 1
  while (start > 0 && times[start] - times[start - 1] < 2 && times.length - start < 8) start--
  const recent = times.slice(start)
  if (recent.length < 2) return null
  const span = (recent[recent.length - 1] - recent[0]) / (recent.length - 1)
  return clampBpm(60 / span)
}

// Classic tempo markings, so a number also means something musically.
const TEMPO_NAMES = [
  [40, 'Grave'],
  [60, 'Largo'],
  [66, 'Larghetto'],
  [76, 'Adagio'],
  [108, 'Andante'],
  [120, 'Moderato'],
  [156, 'Allegro'],
  [176, 'Vivace'],
  [200, 'Presto'],
  [Infinity, 'Prestissimo'],
]
export const tempoName = (bpm) => TEMPO_NAMES.find(([limit]) => bpm < limit)[1]
