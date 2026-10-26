// Chord shapes for the chord symbols in a chart, for the quick-reference panel on the Charts page.
import { parseBar } from './chart.js'
import { NUM_FRETS, chordVoicings, mod12 } from './theory.js'

/** Each distinct chord symbol in a chart, in the order it first appears: [{ symbol, chord }]. */
export const chartChords = (chart) => {
  const seen = new Map()
  for (const section of chart.sections) {
    for (const bar of section.bars) {
      for (const slot of parseBar(bar)?.slots ?? []) {
        if (slot.symbol && !seen.has(slot.symbol)) seen.set(slot.symbol, slot.chord)
      }
    }
  }
  return [...seen].map(([symbol, chord]) => ({ symbol, chord }))
}

const unique = (list) => [...new Set(list)]

// Ever simpler sets of chord tones to look for, since a hand can't hold every note of a 13th chord.
// Guitarists drop the 5th first, then the lower extensions, then fall back to the 7th chord or triad.
const toneSets = (intervals) => {
  const tones = unique(intervals)
  const third = tones.find((i) => [2, 3, 4, 5].includes(i))
  const fifth = tones.find((i) => [6, 7, 8].includes(i))
  const seventh = tones.find((i) => [9, 10, 11].includes(i) && !tones.includes(i - 12))
  const extensions = tones.filter((i) => i > 11)
  const top = extensions.at(-1)
  const sets = [
    tones,
    tones.filter((i) => i !== fifth || fifth !== 7),
    [0, third, seventh, top, fifth === 7 ? undefined : fifth],
    [0, third, fifth, seventh],
    [0, third, fifth],
  ]
  return unique(sets.map((s) => JSON.stringify(unique(s.filter((i) => i !== undefined)).sort((a, b) => a - b)))).map((s) => JSON.parse(s))
}

/**
 * Playable voicings of a parsed chord (from chart.js) in a tuning, lowest on the neck first:
 * [{ frets, notes: [{ string, fret, pitch, role }], partial }]. `role` is 'root', 'bass' (slash note) or the
 * interval in semitones; `partial` marks a shape that leaves out some of the chord's tones.
 */
export const voicingsFor = (chord, tuning, limit = 4) => {
  const found = new Map()
  const all = toneSets(chord.intervals)
  for (const [k, tones] of all.entries()) {
    // A slash chord is voiced from its bass note, so that note is the lowest one played.
    const base = chord.bass ?? chord.root
    const relative = unique([0, ...tones.map((i) => mod12(chord.root + i - base))])
    for (const v of chordVoicings(base, relative, tuning, limit + 2)) {
      const key = v.frets.map((f) => (f === null ? 'x' : f)).join('-')
      if (!found.has(key)) found.set(key, { frets: v.frets, partial: k > 0 && tones.length < unique(chord.intervals.map(mod12)).length, tones })
    }
    if (found.size >= limit) break
  }
  // Power chords (and anything else too thin for a full shape): root, 5th and octave on three adjacent strings.
  if (!found.size) {
    for (let low = 0; low + 2 < tuning.length && found.size < limit; low++) {
      for (let fret = mod12(chord.root - tuning[low]); fret <= NUM_FRETS - 3; fret += 12) {
        const pitches = [0, 7, 12].map((i) => tuning[low] + fret + i)
        const frets = tuning.map((open, s) => (s >= low && s <= low + 2 ? pitches[s - low] - open : null))
        const fretted = frets.filter((f) => f !== null)
        if (Math.min(...fretted) < 0 || Math.max(...fretted) - Math.min(...fretted) > 3) continue
        found.set(frets.join('-'), { frets, partial: chord.intervals.some((i) => ![0, 7].includes(mod12(i))) })
        break
      }
    }
  }
  const position = (frets) => Math.min(...frets.filter((f) => f !== null && f > 0), 99)
  return [...found.values()]
    .sort((a, b) => a.partial - b.partial || position(a.frets) - position(b.frets))
    .slice(0, limit)
    .sort((a, b) => position(a.frets) - position(b.frets))
    .map(({ frets, partial }) => ({
      frets,
      partial,
      notes: frets
        .map((fret, string) => {
          if (fret === null) return null
          const pitch = tuning[string] + fret
          const interval = mod12(pitch - chord.root)
          const role = chord.bass !== null && mod12(pitch) === chord.bass && interval !== 0 ? 'bass' : interval === 0 ? 'root' : interval
          return { string, fret, pitch, role }
        })
        .filter(Boolean),
    }))
}

/** Fret numbers low string to high, as written under a chord box: "x 3 2 0 1 0". */
export const fretText = (frets) => frets.map((f) => (f === null ? 'x' : f)).join(' ')

/** The chord symbols sounding in each bar of a compiled chart; bars that only hold or repeat carry the last chord on. */
export const barSymbols = (song) => {
  const out = []
  let last = null
  for (const bar of song.bars) {
    const symbols = []
    for (const e of bar.events) {
      if (!e.chord) last = null
      else if (e.symbol) last = e.symbol
      if (last) symbols.push(last)
    }
    out.push(symbols)
  }
  return out
}
