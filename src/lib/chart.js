// Lead-sheet charts (iReal Pro style): a chart is sections of bars, each bar a few chord symbols.
// Bars are plain text such as "Dm7 G7". "/" holds the previous chord for one slot, "%" repeats the
// previous bar, an empty bar keeps the last chord ringing and "NC" is a rest for the band.
import { mod12, noteToPc, pcName, spellFrom, usesFlats } from './theory.js'

export const TIME_SIGNATURES = ['4/4', '3/4', '2/4', '5/4', '6/4']
export const CHART_LIMITS = { title: 80, composer: 60, label: 12, bar: 40, sections: 16, barsPerSection: 64, totalBars: 256 }

const ROOT_RE = /^([A-G])([#b♯♭]?)/
const QUALITY_RE = /^(maj|min|m|dim|aug|sus|add|alt|no|\d|#|b|\(|\)|,)*$/

const accidentalValue = (a) => (a === '#' || a === '♯' ? 1 : a === 'b' || a === '♭' ? -1 : 0)
const parseNote = (text) => {
  const m = ROOT_RE.exec(text)
  if (!m) return null
  return { pc: mod12(noteToPc(m[1]) + accidentalValue(m[2])), length: m[0].length }
}

// Spellings people type for the same thing, folded into one vocabulary before reading the extensions.
const normalizeQuality = (q) =>
  q
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/\s+/g, '')
    .replace(/6\/9/, '69')
    .replace(/^(M|Ma|Maj|MAJ)(?=\d)/, 'maj')
    .replace(/^(M|Ma|Maj|MAJ|maj)$/, '')
    .replace(/^mM(?=\d)/, 'mmaj')
    .replace(/[Δ△^]/g, 'maj')
    .replace(/^-/, 'm')
    .replace(/^min/, 'm')
    .replace(/^mi(?!n)/, 'm')
    .replace(/ø7?/, 'm7b5')
    .replace(/^[o°]/, 'dim')
    .replace(/^\+/, 'aug')
    .toLowerCase()

/** Semitones above the root for a chord quality like "m7b5", "13" or "7#9", or null if it can't be read. */
export const qualityIntervals = (quality) => {
  let q = normalizeQuality(quality)
  if (!QUALITY_RE.test(q)) return null
  let third = 4
  let fifth = 7
  let seventh = null
  const add = new Set()
  const take = (re) => {
    const m = re.exec(q)
    if (m) q = q.slice(0, m.index) + q.slice(m.index + m[0].length)
    return m
  }
  if (take(/^alt/) || take(/^7alt/)) return [0, 4, 10, 13, 15, 20]
  const minor = take(/^m(?!aj)/)
  if (minor) third = 3
  if (take(/^dim7/)) return [0, 3, 6, 9]
  if (take(/^dim/)) {
    third = 3
    fifth = 6
  }
  if (take(/^aug/)) fifth = 8
  const major = take(/maj(7|9|11|13)?/)
  if (major) {
    seventh = 11
    const ext = Number(major[1] ?? 7)
    if (ext >= 9) add.add(14)
    if (ext >= 11 && minor) add.add(17)
    if (ext >= 13) add.add(21)
  }
  if (take(/^69|^6\/9/)) {
    add.add(9)
    add.add(14)
  }
  const ext = take(/^(13|11|9|7|6|5)/)
  if (ext) {
    const n = Number(ext[1])
    if (n === 6) add.add(9)
    else if (n === 5) third = null
    else {
      seventh ??= 10
      if (n >= 9) add.add(14)
      if (n >= 11 && (minor || n === 11)) add.add(17)
      if (n === 13) add.add(21)
    }
  }
  if (take(/sus2/)) third = 2
  else if (take(/sus4?/)) third = 5
  // A plain 11 chord leaves out the 3rd, which clashes with the 11th.
  if (ext?.[1] === '11' && !minor && third === 4) third = 5
  const addMatch = () => take(/add(2|4|9|11|13)/)
  for (let m = addMatch(); m; m = addMatch()) add.add({ 2: 14, 4: 17, 9: 14, 11: 17, 13: 21 }[m[1]])
  const alter = () => take(/[#b](5|9|11|13)/)
  for (let m = alter(); m; m = alter()) {
    const sharp = m[0][0] === '#'
    const deg = Number(m[1])
    if (deg === 5) fifth = sharp ? 8 : 6
    else {
      seventh ??= 10
      add.add({ 9: 14, 11: 17, 13: 21 }[deg] + (sharp ? 1 : -1))
      if (deg === 9) add.delete(14)
      if (deg === 13) add.delete(21)
    }
  }
  if (take(/no3/)) third = null
  if (q.replace(/[(),]/g, '') !== '') return null
  return [0, third, fifth, seventh, ...[...add].sort((a, b) => a - b)].filter((i) => i !== null && i !== undefined)
}

/** Reads a chord symbol such as "Bb7", "F#m7b5" or "C/E". Returns null for anything else. */
export const parseChord = (symbol) => {
  const text = String(symbol ?? '').trim()
  const root = parseNote(text)
  if (!root) return null
  let rest = text.slice(root.length)
  let bass = null
  const slash = rest.lastIndexOf('/')
  if (slash >= 0 && ROOT_RE.test(rest.slice(slash + 1))) {
    const b = parseNote(rest.slice(slash + 1))
    if (b.length !== rest.length - slash - 1) return null
    bass = b.pc
    rest = rest.slice(0, slash)
  }
  const intervals = qualityIntervals(rest)
  if (!intervals) return null
  return { root: root.pc, quality: rest, intervals, bass }
}

const NO_CHORD = /^(n\.?c\.?|x)$/i
/** Splits a bar's text into slots: a chord symbol, "/" (hold) or "NC". Returns null if something can't be read. */
export const parseBar = (text) => {
  const tokens = String(text ?? '').trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 1 && tokens[0] === '%') return { repeat: true, slots: [] }
  if (tokens.length > 8) return null
  const slots = []
  for (const t of tokens) {
    if (t === '/' || t === '-') slots.push({ hold: true })
    else if (NO_CHORD.test(t)) slots.push({ rest: true })
    else {
      const chord = parseChord(t)
      if (!chord) return null
      slots.push({ symbol: t, chord })
    }
  }
  return { repeat: false, slots }
}

/** The chord symbols in a bar that can't be read, so the editor can point at them. */
export const badTokens = (text) =>
  String(text ?? '')
    .trim()
    .split(/\s+/)
    .filter((t) => t && t !== '/' && t !== '-' && t !== '%' && !NO_CHORD.test(t) && !parseChord(t))

/** How many beats each of `slots` slots gets in a bar: as even as possible, the extra going first. */
export const slotBeats = (slots, beats) => {
  if (slots <= 0) return []
  if (slots >= beats) return Array.from({ length: slots }, () => beats / slots)
  const base = Math.floor(beats / slots)
  const extra = beats - base * slots
  return Array.from({ length: slots }, (_, i) => base + (i < extra ? 1 : 0))
}

export const beatsPerBar = (time) => Number(String(time).split('/')[0]) || 4

export const isMinorKey = (key) => /m$/.test(key)
export const keyTonic = (key) => String(key).replace(/m$/, '')
// Key names as they're usually written, by pitch class: Db and Ab major (5 and 4 flats rather than 7 and 8 sharps),
// C# and G# minor (4 and 5 sharps rather than 8 and 7 flats).
const MAJOR_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const MINOR_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
// A tonic written with a flat or sharp keeps it; otherwise minor keys borrow the spelling of their relative major
// (Dm reads like F, so flats).
export const keyUsesFlats = (key) => {
  const tonic = keyTonic(key)
  if (/[#b]/.test(tonic)) return tonic.includes('b')
  const pc = noteToPc(tonic)
  return usesFlats(isMinorKey(key) ? MAJOR_NAMES[mod12(pc + 3)] : tonic)
}
// Both names for the keys guitarists see either way (C#/Db, F#/Gb, D#m/Ebm, G#m/Abm), so older charts still load.
export const ALL_KEYS = [
  ...['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  ...['C', 'C#', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'].map((k) => `${k}m`),
]
/** The same key (major or minor) moved `semitones` up, spelled the way it's usually written. */
export const transposeKey = (key, semitones) => {
  const minor = isMinorKey(key)
  const pc = mod12(noteToPc(keyTonic(key)) + semitones)
  return `${(minor ? MINOR_NAMES : MAJOR_NAMES)[pc]}${minor ? 'm' : ''}`
}
export const keyDistance = (from, to) => mod12(noteToPc(keyTonic(to)) - noteToPc(keyTonic(from)))

const LETTERS = 'CDEFGAB'
/**
 * Moves a chord symbol by `semitones`, keeping its quality text as written. With `letters` (how many letter names
 * the key moves, e.g. 2 from Bb to D) roots keep their letter's place in the key, so a passing C#dim7 in Bb becomes
 * G#dim7 in F (not Abdim7); without it, or when that would need E#, B#, Fb, Cb or a double accidental, roots use
 * the `flats` spelling.
 */
export const transposeSymbol = (symbol, semitones, flats, letters = null) => {
  const chord = parseChord(symbol)
  if (!chord || !semitones) return symbol
  const text = String(symbol).trim()
  const rootText = ROOT_RE.exec(text)[0]
  const name = (pc, written) => {
    const spelled = letters === null ? null : spellFrom(written, pc + semitones, letters, flats)
    // E#, B#, Fb and Cb are correct but hard to read on a chart, so those fall back to the key's sharps or flats.
    return spelled && !/##|bb|E#|B#|Fb|Cb/.test(spelled) ? spelled : pcName(pc + semitones, flats)
  }
  const bassText = chord.bass === null ? '' : text.slice(text.lastIndexOf('/') + 1)
  return `${name(chord.root, rootText)}${chord.quality}${chord.bass === null ? '' : `/${name(chord.bass, bassText)}`}`
}

/** Display pieces of a chord symbol: root, quality (with real ♭/♯) and slash bass. */
export const chordParts = (symbol) => {
  const pretty = (s) => s.replace(/b/g, '♭').replace(/#/g, '♯')
  const chord = parseChord(symbol)
  if (!chord) return { root: symbol, quality: '', bass: '' }
  const text = String(symbol).trim()
  const rootLen = ROOT_RE.exec(text)[0].length
  const slash = chord.bass === null ? -1 : text.lastIndexOf('/')
  return {
    root: pretty(text.slice(0, rootLen)),
    quality: pretty(chord.quality),
    bass: slash >= 0 ? pretty(text.slice(slash + 1)) : '',
  }
}

/** Bar texts moved to another key, for showing and playing a transposed chart. */
export const transposeChart = (chart, toKey) => {
  const shift = keyDistance(chart.key, toKey)
  if (!shift) return chart
  const flats = keyUsesFlats(toKey)
  const letters = LETTERS.indexOf(keyTonic(toKey)[0]) - LETTERS.indexOf(keyTonic(chart.key)[0])
  const moveBar = (bar) =>
    String(bar)
      .split(/(\s+)/)
      .map((t) => (t.trim() && t !== '/' && t !== '%' ? transposeSymbol(t, shift, flats, letters) : t))
      .join('')
  return { ...chart, key: toKey, sections: chart.sections.map((s) => ({ ...s, bars: s.bars.map(moveBar) })) }
}

/**
 * Turns a chart into the bars the band plays: each bar lists its chord events with start beat and length.
 * `chord` is null for a rest. Bars that can't be read keep the previous chord.
 */
export const compileChart = (chart) => {
  const beats = beatsPerBar(chart.time)
  const bars = []
  let current = null
  let previous = null
  chart.sections.forEach((section, s) =>
    section.bars.forEach((text, b) => {
      const parsed = parseBar(text)
      let events
      if (parsed?.repeat && previous) events = previous.map((e) => ({ ...e }))
      else if (!parsed || !parsed.slots.length) events = [{ beat: 0, beats, chord: current }]
      else {
        const lengths = slotBeats(parsed.slots.length, beats)
        events = []
        let beat = 0
        parsed.slots.forEach((slot, i) => {
          if (slot.hold && events.length) events.at(-1).beats += lengths[i]
          else {
            if (!slot.hold) current = slot.rest ? null : slot.chord
            events.push({ beat, beats: lengths[i], chord: current, symbol: slot.symbol })
          }
          beat += lengths[i]
        })
      }
      current = events.at(-1).chord
      previous = events
      bars.push({ section: s, bar: b, events })
    }),
  )
  return { beats, bars }
}

/** A new, empty chart for the editor. */
export const blankChart = () => ({
  title: '',
  composer: '',
  style: 'swing',
  key: 'C',
  time: '4/4',
  tempo: 120,
  sections: [{ label: 'A', bars: Array(8).fill('') }],
})

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

/** Checks and tidies a chart from the editor. Returns `{ chart }` or `{ error }`. */
export const validateChart = (draft, styles) => {
  const chart = {
    title: clean(draft.title),
    composer: clean(draft.composer),
    style: Object.hasOwn(styles, draft.style) ? draft.style : Object.keys(styles)[0],
    key: ALL_KEYS.includes(draft.key) ? draft.key : 'C',
    time: TIME_SIGNATURES.includes(draft.time) ? draft.time : '4/4',
    tempo: Math.round(Math.max(40, Math.min(300, Number(draft.tempo) || 120))),
    sections: (draft.sections ?? []).map((s) => ({ label: clean(s.label), bars: (s.bars ?? []).map(clean) })).filter((s) => s.bars.length),
  }
  if (!chart.title) return { error: 'Give the chart a title.' }
  if (chart.title.length > CHART_LIMITS.title) return { error: `Keep the title under ${CHART_LIMITS.title} characters.` }
  if (chart.composer.length > CHART_LIMITS.composer) return { error: `Keep the composer under ${CHART_LIMITS.composer} characters.` }
  if (!chart.sections.length) return { error: 'Add at least one bar.' }
  if (chart.sections.length > CHART_LIMITS.sections) return { error: `Charts can have up to ${CHART_LIMITS.sections} sections.` }
  if (chart.sections.reduce((n, s) => n + s.bars.length, 0) > CHART_LIMITS.totalBars) return { error: `Charts can have up to ${CHART_LIMITS.totalBars} bars.` }
  for (const [i, s] of chart.sections.entries()) {
    const name = s.label || `section ${i + 1}`
    if (s.label.length > CHART_LIMITS.label) return { error: `Keep section labels under ${CHART_LIMITS.label} characters.` }
    if (s.bars.length > CHART_LIMITS.barsPerSection) return { error: `${name} has more than ${CHART_LIMITS.barsPerSection} bars.` }
    for (const [b, bar] of s.bars.entries()) {
      if (bar.length > CHART_LIMITS.bar) return { error: `Bar ${b + 1} of ${name} is too long.` }
      const bad = badTokens(bar)
      if (bad.length || (bar && !parseBar(bar))) return { error: `Bar ${b + 1} of ${name}: can't read "${bad[0] ?? bar}".` }
    }
  }
  if (!chart.sections.some((s) => s.bars.some(Boolean))) return { error: 'Add some chords.' }
  return { chart }
}
