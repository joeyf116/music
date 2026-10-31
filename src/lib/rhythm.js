// Rhythm trainer: metronome settings, rhythm patterns for strumming drills, and timing feedback for tapping.
// Everything here is plain data and maths so it can be tested; audio lives in rhythmEngine.js and player.js.
import { finalize, meterInfo, TICKS_PER_WHOLE } from './exercises.js'
import { chordVoicings, mod12 } from './theory.js'

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

// ---- Timing feedback ----

// Within 25 ms is as tight as most listeners can hear; 50 ms is still clean; beyond that you can hear it flam.
export const GRADES = [
  { id: 'perfect', limit: 25, label: 'Perfect' },
  { id: 'good', limit: 50, label: 'Good' },
  { id: 'off', limit: Infinity, label: 'Off' },
]

/**
 * Compare a tap (seconds, audio clock) with the nearest target time. Returns null when there are no targets
 * close enough to mean anything (more than `window` seconds away).
 */
export const judgeTap = (tap, targets, window = 0.35) => {
  let best = null
  for (const t of targets) if (!best || Math.abs(tap - t) < Math.abs(tap - best)) best = t
  if (best === null || Math.abs(tap - best) > window) return null
  const ms = Math.round((tap - best) * 1000)
  const grade = GRADES.find((g) => Math.abs(ms) <= g.limit)
  return { target: best, ms, grade: grade.id, label: grade.id === 'off' ? (ms < 0 ? 'Early' : 'Late') : grade.label }
}

/** Average offset (negative = ahead of the beat), spread (standard deviation) and a plain-words verdict. */
export const summarizeTaps = (offsets) => {
  if (!offsets.length) return null
  const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length
  const spread = Math.sqrt(offsets.reduce((a, b) => a + (b - mean) ** 2, 0) / offsets.length)
  const tight = offsets.filter((o) => Math.abs(o) <= GRADES[0].limit).length
  const lean = Math.abs(mean) < 10 ? 'Right on the beat on average' : mean < 0 ? `Rushing: ${Math.round(-mean)} ms ahead on average` : `Dragging: ${Math.round(mean)} ms behind on average`
  const steadiness = spread < 15 ? 'very steady' : spread < 30 ? 'fairly steady' : 'a bit uneven'
  return { count: offsets.length, mean: Math.round(mean), spread: Math.round(spread), tight, verdict: `${lean}, ${steadiness}.` }
}

// ---- Rhythm patterns ----
// A pattern is written one beat at a time: "x" is a strum, "." a gap. A beat's length sets its grid, so
// "x." is 8ths, "x.x" is triplets and "x..x" is 16ths, and one bar can mix them.

export const RHYTHM_LEVELS = [
  { id: 1, name: 'Quarters & 8ths', about: 'Count “1 & 2 & 3 & 4 &” out loud and keep your strumming hand moving down-up the whole time.' },
  { id: 2, name: 'Rests', about: 'Keep the hand moving through the gaps and just miss the strings. Silence is part of the rhythm.' },
  { id: 3, name: 'Syncopation', about: 'Accents land on the “&”s. Feel the beat in your foot so the off-beats don’t drag the pulse with them.' },
  { id: 4, name: '16th notes', about: 'Count “1 e & a”. Your hand moves twice as fast: down on 1 and &, up on e and a.' },
  { id: 5, name: 'Triplets & swing', about: 'Count “1 trip let”. Swing keeps only the 1st and 3rd of each triplet: long-short, long-short.' },
  { id: 6, name: 'Mixed', about: 'Switch between 8ths, triplets and 16ths inside one bar. Go slowly and say the counts.' },
]

export const RHYTHMS = [
  { id: 'quarters', level: 1, name: 'Steady quarters', beats: 'x. x. x. x.' },
  { id: 'eighths', level: 1, name: 'Straight 8ths', beats: 'xx xx xx xx' },
  { id: 'q-e-q-e', level: 1, name: 'Quarter, two 8ths', beats: 'x. xx x. xx' },
  { id: 'e-q-e-q', level: 1, name: 'Two 8ths, quarter', beats: 'xx x. xx x.' },
  { id: 'waltz', level: 1, name: 'Waltz (3/4)', beats: 'x. xx xx' },
  { id: 'one-three', level: 2, name: 'Beats 1 and 3', beats: 'x. .. x. ..' },
  { id: 'backbeat', level: 2, name: 'Backbeat (2 and 4)', beats: '.. x. .. x.' },
  { id: 'offbeats', level: 2, name: 'Off-beats only', beats: '.x .x .x .x' },
  { id: 'rest-and', level: 2, name: 'Rest on the &s of 2 and 4', beats: 'xx x. xx x.' },
  { id: 'skip-one', level: 2, name: 'Rest on 1', beats: '.x xx xx xx' },
  { id: 'pop', level: 3, name: 'Pop strum (D DU UDU)', beats: 'x. xx .x xx' },
  { id: 'charleston', level: 3, name: 'Charleston', beats: 'x. .x .. ..' },
  { id: 'push', level: 3, name: 'Push into 3', beats: 'x. .x .x x.' },
  { id: 'anticipate', level: 3, name: 'Anticipated 1', beats: 'x. x. x. .x' },
  { id: 'tresillo', level: 3, name: 'Tresillo (3+3+2)', beats: 'x..x ..x. x..x ..x.' },
  { id: 'sixteenths', level: 4, name: 'Straight 16ths', beats: 'xxxx xxxx xxxx xxxx' },
  { id: 'e-and', level: 4, name: '1 e &', beats: 'xxx. xxx. xxx. xxx.' },
  { id: 'and-a', level: 4, name: '1 & a', beats: 'x.xx x.xx x.xx x.xx' },
  { id: 'dotted', level: 4, name: 'Dotted 8th + 16th', beats: 'x..x x..x x..x x..x' },
  { id: 'funk', level: 4, name: 'Funk 16ths', beats: 'x..x ..x. .x.x x...' },
  { id: 'triplets', level: 5, name: 'Straight triplets', beats: 'xxx xxx xxx xxx' },
  { id: 'shuffle', level: 5, name: 'Shuffle / swing', beats: 'x.x x.x x.x x.x' },
  { id: 'trip-quarter', level: 5, name: 'Quarter, triplet', beats: 'x.. xxx x.. xxx' },
  { id: 'trip-let', level: 5, name: 'Rest on “trip”', beats: 'x.x x.x xxx x..' },
  { id: 'mix-8-16', level: 6, name: '8ths into 16ths', beats: 'xx xx xxxx xxxx' },
  { id: 'mix-8-3', level: 6, name: '8ths into triplets', beats: 'xx xxx xx xxx' },
  { id: 'mix-all', level: 6, name: 'Gear change', beats: 'x. xx xxx xxxx' },
  { id: 'mix-sync', level: 6, name: 'Syncopated mix', beats: 'x..x .x x.x xx' },
]

export const rhythmById = (id) => RHYTHMS.find((r) => r.id === id)

const CELL_COUNTS = { 1: [''], 2: ['', '&'], 3: ['', 'trip', 'let'], 4: ['', 'e', '&', 'a'], 6: ['', 'la', 'li', '&', 'la', 'li'] }
const BEAT_TICKS = TICKS_PER_WHOLE / 4

/** A beat's text, cleaned to x and ., with a length the 12-tick beat divides evenly. */
const cleanBeat = (text) => {
  const cells = String(text).replace(/[^x.]/gi, '').toLowerCase() || '.'
  return [1, 2, 3, 4, 6].includes(cells.length) ? cells : cells.padEnd(cells.length < 4 ? 4 : 6, '.').slice(0, 6)
}

/** The beats of a pattern string, each a run of "x" and "." with a valid grid. */
export const parseBeats = (beats) => String(beats).trim().split(/\s+/).filter(Boolean).map(cleanBeat)

/**
 * One cell per grid step: { beat, cell, cells, tick, hit, count, strum }. Strumming arrows follow "constant motion":
 * the hand goes down on the beat and on "&", up on the in-between notes, whether or not it hits the strings.
 */
export const rhythmCells = (beats) =>
  parseBeats(beats).flatMap((cells, beat) => {
    const per = cells.length
    let hits = 0
    return [...cells].map((c, cell) => {
      const hit = c === 'x'
      let strum
      // Triplets don't split into down-up pairs, so their hits alternate within the beat instead.
      if (per === 3) strum = hit ? (hits++ % 2 === 0 ? 'down' : 'up') : null
      else strum = cell % 2 === 0 ? 'down' : 'up'
      return { beat, cell, cells: per, tick: beat * BEAT_TICKS + (cell * BEAT_TICKS) / per, hit, count: cell === 0 ? String(beat + 1) : CELL_COUNTS[per]?.[cell] ?? '', strum }
    })
  })

/** Toggle one cell of a pattern string, returning the new string. */
export const toggleCell = (beats, beat, cell) =>
  parseBeats(beats)
    .map((cells, b) => (b === beat ? [...cells].map((c, i) => (i === cell ? (c === 'x' ? '.' : 'x') : c)).join('') : cells))
    .join(' ')

/** Change how finely one beat is split (keeping the hit on the beat if there was one). */
export const regridBeat = (beats, beat, size) =>
  parseBeats(beats)
    .map((cells, b) => (b === beat ? (cells[0] === 'x' ? 'x' : '.') + '.'.repeat(size - 1) : cells))
    .join(' ')

export const PLAY_ON = [
  { value: 'muted', label: 'Muted strum', title: 'Strings muted with the fretting hand: pure rhythm' },
  { value: 'chord', label: 'Chord', title: 'A chord in the current key' },
  { value: 'note', label: 'Single note', title: 'The key’s root on a low string' },
]

// The strings a strum covers (the middle four of a six-string, or as many as the tuning has).
const strumStrings = (tuning) => {
  const n = tuning.length
  const from = Math.max(0, Math.floor((n - 4) / 2))
  return Array.from({ length: Math.min(4, n) }, (_, i) => from + i)
}

/** The notes one hit plays, for a tuning: muted strings ("x" in the tab), a chord in the key, or the root. */
export const hitNotes = (tuning, playOn, rootPc, minor = false) => {
  if (playOn === 'note') {
    const fret = mod12(rootPc - tuning[0])
    return [{ string: 0, fret, pitch: tuning[0] + fret }]
  }
  if (playOn === 'chord') {
    const shape = chordVoicings(rootPc, minor ? [0, 3, 7] : [0, 4, 7], tuning, 1)[0]
    if (shape) return shape.frets.map((fret, string) => (fret === null ? null : { string, fret, pitch: tuning[string] + fret })).filter(Boolean)
  }
  return strumStrings(tuning).map((string) => ({ string, fret: 'x', pitch: tuning[string] + 5, muted: true }))
}

/**
 * A playable score (same shape as the fretboard drills, so the tab and player can use it) that repeats the
 * pattern for `bars` bars. Every grid cell is a column so the counting is always visible; gaps are rests.
 */
export const rhythmScore = (beats, { bars = 2, tuning, playOn = 'muted', rootPc = 4, minor = true } = {}) => {
  const cells = rhythmCells(beats)
  const beatCount = parseBeats(beats).length
  const meter = meterInfo(`${beatCount}/4`)
  const notes = hitNotes(tuning, playOn, rootPc, minor)
  const muted = notes.some((n) => n.muted)
  const events = []
  for (let bar = 0; bar < bars; bar++) {
    for (const c of cells) {
      events.push({ notes: c.hit ? notes : [], tick: bar * meter.barTicks + c.tick, strum: c.hit ? c.strum : undefined, muted, label: c.hit ? (c.strum === 'up' ? '↑' : '↓') : '', cell: c })
    }
  }
  const score = finalize({ events, totalTicks: bars * meter.barTicks }, meter)
  // Counts come from the cell (so triplets read "trip let", not the 16th names the tick would give).
  score.events.forEach((e) => (e.count = e.cell.count))
  return score
}
