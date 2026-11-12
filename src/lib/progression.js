// The Practice page's progression: a list of chords in the key, each with its own voicing and length, played as one
// looping tab, either as the chords themselves or as a scale (or arpeggio) line that connects them in one position.
// Kept free of React and the DOM so it can be tested and shared.
import { PROGRESSIONS, finalize, meterInfo, parseChord, parseProgression } from './exercises.js'
import { CHORDS, INVERSION_CHORDS, INVERSION_NAMES, NUM_FRETS, SCALES, chordInversions, chordVoicings, intervalName, mod12, noteToPc, scalePosition, spellFrom, usesFlats } from './theory.js'

const METER = meterInfo('4/4')

/** How long a chord lasts, in beats. */
export const BEAT_OPTIONS = [1, 2, 4, 8]
/** How a chord is voiced. Each chord keeps its own; new chords use the last one picked. */
export const VOICING_KINDS = [
  { value: 'shapes', label: 'Shapes', title: 'Full open and barre chord shapes' },
  { value: 'triads', label: 'Triads', title: 'Three-note chords on three adjacent strings' },
  { value: 'drop2', label: 'Drop 2', title: 'Four-note chords on four adjacent strings' },
  { value: 'drop3', label: 'Drop 3', title: 'Bass note a string apart from the other three' },
]
/** What you practise over the progression. */
export const PRACTICE_MODES = [
  { value: 'chords', label: 'Chords', title: 'Play each chord in its voicing' },
  { value: 'scales', label: 'Scales', title: 'Play a line through the chords in one scale position' },
]
/** The line in Scales: stepping through the scale, or only the chord's own notes. */
export const LINE_KINDS = [
  { value: 'scale', label: 'Scale', title: 'Step through the scale, landing on a chord note on each change' },
  { value: 'arpeggio', label: 'Arpeggio', title: 'Only the notes of each chord' },
]
export const CHORD_STYLES = [
  { value: 'strum', label: 'Strum' },
  { value: 'arpeggio', label: 'Arpeggio' },
  { value: 'block', label: 'Block' },
]

let counter = 0
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`

// ---- Naming: "Em", and "vi" counted from the major scale (A minor reads i ♭III ♭VI ♭VII), as the key's chord strip does ----
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
// Semitones above the key → [scale degree, accidental].
const DEGREES = [
  [0, ''],
  [1, '♭'],
  [1, ''],
  [2, '♭'],
  [2, ''],
  [3, ''],
  [4, '♭'],
  [4, ''],
  [5, '♭'],
  [5, ''],
  [6, '♭'],
  [6, ''],
]
const NUMERAL_SUFFIX = { dim: '°', aug: '+', sus2: 'sus2', sus4: 'sus4', maj7: 'maj7', dom7: '7', min7: '7', m7b5: 'ø7', dim7: '°7', minMaj7: 'maj7', augMaj7: '+maj7', six: '6', min6: '6', add9: 'add9', dom9: '9' }
const isMinorType = (type) => {
  const tones = CHORDS[type]?.intervals ?? []
  return tones.includes(3) && !tones.includes(4)
}

/** The chord a step stands for in a key: { rootPc, rootName, name, numeral, intervals, type }. */
export function stepChord(step, keyName) {
  const keyPc = noteToPc(keyName)
  const offset = mod12(step.offset)
  const [degree, accidental] = DEGREES[offset]
  const rootPc = mod12(keyPc + offset)
  const rootName = spellFrom(keyName, rootPc, degree, accidental ? true : usesFlats(keyName))
  const def = CHORDS[step.type] ?? CHORDS.maj
  const roman = isMinorType(step.type) ? ROMAN[degree].toLowerCase() : ROMAN[degree]
  return { rootPc, rootName, name: `${rootName}${def.symbol}`, numeral: `${accidental}${roman}${NUMERAL_SUFFIX[step.type] ?? ''}`, intervals: def.intervals, type: CHORDS[step.type] ? step.type : 'maj' }
}

// ---- Voicings ----
const minFret = (notes) => Math.min(...notes.map((n) => n.fret))
const shapeHint = (notes) => (!notes.length ? '' : notes.some((n) => n.fret === 0) ? 'open' : `fr ${minFret(notes)}`)
const fretRange = (notes) => {
  const lo = minFret(notes)
  const hi = Math.max(...notes.map((n) => n.fret))
  return lo === hi ? `fr ${lo}` : `fr ${lo}–${hi}`
}
const stringNumbers = (strings, tuning) =>
  strings
    .map((s) => tuning.length - s)
    .reverse()
    .join('-')
// Where a voicing sits on the neck, for keeping chords close together.
const centre = (notes) => (notes.length ? notes.reduce((sum, n) => sum + n.fret, 0) / notes.length : 0)

/** The voicing kinds a chord type has: full shapes always, triads for three-note chords, drop voicings for 7ths. */
export const kindsFor = (type) => {
  const def = CHORDS[type]
  const inversions = INVERSION_CHORDS.includes(type)
  return VOICING_KINDS.filter((k) => k.value === 'shapes' || (inversions && (k.value === 'triads' ? def.intervals.length === 3 : def.intervals.length === 4)))
}
/** The kind to use for a chord: the one asked for if the chord has it, else its nearest relative, else shapes. */
export const resolveKind = (kind, type) => {
  const ids = kindsFor(type).map((k) => k.value)
  if (ids.includes(kind)) return kind
  if ((kind === 'drop2' || kind === 'drop3') && ids.includes('triads')) return 'triads'
  if (kind === 'triads' && ids.includes('drop2')) return 'drop2'
  return 'shapes'
}

const cache = new Map()
/** Every voicing of a chord of one kind, low on the neck to high: [{ label, hint, notes: [{ string, fret }] }]. */
export function voicingList(rootPc, type, kind, tuning) {
  const k = resolveKind(kind, type)
  const id = `${k}|${rootPc}|${type}|${tuning}`
  if (!cache.has(id)) {
    if (cache.size > 300) cache.clear()
    const intervals = CHORDS[type].intervals
    const strip = (notes) => notes.map((n) => ({ string: n.string, fret: n.fret }))
    const list =
      k === 'shapes'
        ? chordVoicings(rootPc, intervals, tuning, 8).map((v, i) => ({ label: `Shape ${i + 1}`, hint: shapeHint(v.notes), notes: strip(v.notes) }))
        : chordInversions(rootPc, intervals, tuning, k === 'drop3' ? 'drop3' : 'drop2').flatMap((set) =>
            set.shapes.map((sh) => ({ label: `Strings ${stringNumbers(set.strings, tuning)} · ${INVERSION_NAMES[sh.inversion]}`, hint: `fr ${minFret(sh.notes)}`, notes: strip(sh.notes) })),
          )
    cache.set(id, list)
  }
  return cache.get(id)
}

/** The voicing in `list` nearest to `previous` notes on the neck (or to `fret` when there's nothing before it). */
export const nearestVoicing = (list, previous, fret = 3) => {
  const target = previous?.length ? centre(previous) : fret
  let best = 0
  list.forEach((v, i) => {
    if (Math.abs(centre(v.notes) - target) < Math.abs(centre(list[best].notes) - target)) best = i
  })
  return best
}

// Custom frets were set in one key; in another key they move by the shortest distance, staying on the neck.
const transpose = (notes, from, to) => {
  let delta = mod12(noteToPc(to) - noteToPc(from))
  if (delta > 6) delta -= 12
  let moved = notes.map((n) => ({ string: n.string, fret: n.fret + delta }))
  if (moved.some((n) => n.fret < 0)) moved = moved.map((n) => ({ ...n, fret: n.fret + 12 }))
  if (moved.some((n) => n.fret > NUM_FRETS)) moved = moved.map((n) => ({ ...n, fret: n.fret - 12 }))
  return moved
}

/**
 * Everything about one step in a key and tuning: its chord, the voicings of its kind, which one it uses, and the
 * notes it sounds ({ string, fret, pitch }). `edited` is true when its frets were changed by hand.
 */
export function voiceStep(step, keyName, tuning) {
  const chord = stepChord(step, keyName)
  const kind = resolveKind(step.kind, chord.type)
  const voicings = voicingList(chord.rootPc, chord.type, kind, tuning)
  const index = Math.min(Math.max(0, Number(step.index) || 0), Math.max(0, voicings.length - 1))
  const edited = Array.isArray(step.frets) && step.frets.length > 0
  const raw = edited ? transpose(step.frets, step.fretsKey ?? keyName, keyName) : (voicings[index]?.notes ?? [])
  const notes = raw.filter((n) => n.string < tuning.length).map((n) => ({ string: n.string, fret: n.fret, pitch: tuning[n.string] + n.fret }))
  return { chord, kind, kinds: kindsFor(chord.type), voicings, index, edited, notes }
}

// ---- Building and changing the progression ----

/** A new step for a chord (rootPc + type) in a key, voiced near the chord before it. */
export function createStep({ rootPc, type }, { keyName, tuning, kind = 'shapes', previous = null, beats = 4, id = newId() }) {
  const offset = mod12(rootPc - noteToPc(keyName))
  const k = resolveKind(kind, type)
  const list = voicingList(mod12(rootPc), type, k, tuning)
  return { id, offset, type, beats, kind: k, index: list.length ? nearestVoicing(list, previous) : 0, frets: null }
}

/** Steps for a progression typed as numerals or names ("I V vi IV", "Am F C G"), each voiced near the last. */
export function stepsFromText(text, { keyName, tuning, kind = 'shapes', previous = null, beats = 4 }) {
  const { chords, errors } = parseProgression(text, keyName)
  const steps = []
  let last = previous
  for (const c of chords) {
    const step = createStep(c, { keyName, tuning, kind, previous: last, beats })
    steps.push(step)
    last = voiceStep(step, keyName, tuning).notes
  }
  return { steps, errors }
}

/** Every chord re-voiced in one kind, each near the one before, so the changes move as little as possible. */
export function revoiceAll(steps, { keyName, tuning, kind }) {
  let last = null
  return steps.map((step) => {
    const chord = stepChord(step, keyName)
    const k = resolveKind(kind, chord.type)
    const list = voicingList(chord.rootPc, chord.type, k, tuning)
    const next = { ...step, kind: k, index: list.length ? nearestVoicing(list, last) : 0, frets: null }
    last = voiceStep(next, keyName, tuning).notes
    return next
  })
}

export const updateStep = (steps, index, change) => steps.map((s, i) => (i === index ? { ...s, ...change } : s))
export const removeStep = (steps, index) => steps.filter((_, i) => i !== index)
export const duplicateStep = (steps, index, id = newId()) => (steps[index] ? [...steps.slice(0, index + 1), { ...steps[index], id }, ...steps.slice(index + 1)] : steps)
/** Move a step one place earlier (-1) or later (+1); out-of-range moves leave the list as it is. */
export const moveStep = (steps, index, delta) => {
  const to = index + delta
  if (index < 0 || index >= steps.length || to < 0 || to >= steps.length) return steps
  const next = [...steps]
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

/**
 * Edit a voicing by hand on the neck: tapping a chord note on a string moves that string to it, tapping a note the
 * voicing already plays mutes that string (as long as two notes are left). Returns the step's new frets.
 */
export function editVoicing(notes, string, fret) {
  const plays = notes.find((n) => n.string === string)
  if (plays && plays.fret === fret) return notes.length > 2 ? notes.filter((n) => n.string !== string).map(({ string: s, fret: f }) => ({ string: s, fret: f })) : null
  return [...notes.filter((n) => n.string !== string), { string, fret }].sort((a, b) => a.string - b.string).map(({ string: s, fret: f }) => ({ string: s, fret: f }))
}

/** Stored steps that still make sense (anything else is dropped rather than breaking the page). */
export const validSteps = (steps) =>
  Array.isArray(steps)
    ? steps
        .filter((s) => s && typeof s.id === 'string' && Number.isInteger(s.offset) && CHORDS[s.type])
        .map((s) => ({
          ...s,
          beats: BEAT_OPTIONS.includes(s.beats) ? s.beats : 4,
          frets: Array.isArray(s.frets) && s.frets.length && s.frets.every((n) => Number.isInteger(n?.string) && Number.isInteger(n?.fret)) ? s.frets : null,
        }))
    : []

/** A progression to start with: the pop changes in a major key, the epic minor ones in a minor key. */
export const starterText = (mood) => (mood === 'minor' ? 'i bVI bIII bVII' : 'I V vi IV')
export { PROGRESSIONS }

/**
 * The old practice tab's pinned chords as steps in the current key, keeping the frets they were pinned with.
 * Pinned scale runs are left out: the Practice page builds those lines from the progression now.
 */
export function stepsFromPinned(items, keyName) {
  if (!Array.isArray(items)) return []
  const keyPc = noteToPc(keyName)
  return items.flatMap((item) => {
    if (item?.kind !== 'chord' || typeof item.name !== 'string' || !Array.isArray(item.columns?.[0]?.notes)) return []
    const parsed = parseChord(item.name, keyPc)
    if (!parsed || !CHORDS[parsed.type]) return []
    const frets = item.columns[0].notes.filter((n) => Number.isInteger(n?.string) && Number.isInteger(n?.fret)).map((n) => ({ string: n.string, fret: n.fret }))
    return [{ id: typeof item.id === 'string' ? item.id : newId(), offset: mod12(parsed.rootPc - keyPc), type: parsed.type, beats: BEAT_OPTIONS.includes(item.beats) ? item.beats : 4, kind: 'shapes', index: 0, frets: frets.length ? frets : null, fretsKey: keyName }]
  })
}

// ---- Scales through the changes ----

/** The key's scale in each position: [{ label: '1', hint: 'fr 5–8', notes: [{ string, fret, pitch }] }]. */
export function scalePositions(keyName, scaleType, tuning) {
  const scale = SCALES[scaleType] ?? SCALES.major
  const rootPc = noteToPc(keyName)
  return scale.intervals.map((_, d) => {
    const notes = scalePosition(rootPc, scale.intervals, tuning, d)
    return { label: String(d + 1), hint: fretRange(notes), notes }
  })
}

// The notes a line can use over one chord: the position's scale notes, or the chord's own notes in the same frets.
const linePool = (position, chord, line, tuning) => {
  if (line !== 'arpeggio') return position
  const lo = minFret(position)
  const hi = Math.max(...position.map((n) => n.fret))
  const mid = (lo + hi) / 2
  const pcs = chord.intervals.map((i) => mod12(chord.rootPc + i))
  const byPitch = new Map()
  tuning.forEach((open, string) => {
    for (let fret = lo; fret <= hi; fret++) {
      const pitch = open + fret
      if (!pcs.includes(mod12(pitch))) continue
      const seen = byPitch.get(pitch)
      if (!seen || Math.abs(fret - mid) < Math.abs(seen.fret - mid)) byPitch.set(pitch, { string, fret, pitch })
    }
  })
  const pool = [...byPitch.values()].sort((a, b) => a.pitch - b.pitch)
  return pool.length ? pool : position
}

/**
 * A line of 8th notes through the progression in one scale position. Each chord starts on its own chord note nearest
 * to where the line just was, then carries on in the same direction, turning at the edges of the position. So the
 * line keeps moving and lands on a chord note on every change. Returns one list of notes per step.
 */
export function buildLine(voiced, position, line, tuning) {
  let prev = null
  let dir = 1
  return voiced.map(({ chord }, stepIndex, all) => {
    const pool = linePool(position, chord, line, tuning)
    const count = (all[stepIndex].beats ?? 4) * 2
    const pcs = new Set(chord.intervals.map((i) => mod12(chord.rootPc + i)))
    const tones = pool.map((n, i) => (pcs.has(mod12(n.pitch)) ? i : -1)).filter((i) => i >= 0)
    const choices = tones.length ? tones : pool.map((_, i) => i)
    let at
    if (prev === null) {
      at = choices.find((i) => mod12(pool[i].pitch) === chord.rootPc) ?? choices[0]
    } else {
      // Nearest chord note, a little ahead in the direction the line is going; repeating the last note is a last resort.
      const cost = (i) => Math.abs(pool[i].pitch - (prev + dir * 0.5)) + (pool[i].pitch === prev ? 3 : 0)
      at = choices.reduce((best, i) => (cost(i) < cost(best) ? i : best), choices[0])
    }
    const notes = []
    for (let k = 0; k < count; k++) {
      notes.push(pool[at])
      if (pool.length < 2) continue
      if (at + dir < 0 || at + dir >= pool.length) dir = -dir
      at += dir
    }
    prev = notes.at(-1).pitch
    return notes
  })
}

/**
 * The whole practice session for the player and the page: each step voiced, the tab (`columns`, with `owner[i]` the
 * step of column i, and `starts[k]` the first column of step k) and the `score` that plays it.
 * Chords mode plays the voicings (strum, arpeggio or block). Scales mode plays the chords quietly with the line over
 * them as 8th notes (`playLine: false` leaves the line for you to play).
 */
export function practiceSession({ steps, keyName, scaleType, tuning, mode = 'chords', position = 0, line = 'scale', style = 'strum', playLine = true }) {
  const voiced = steps.map((step) => ({ ...voiceStep(step, keyName, tuning), beats: step.beats ?? 4 }))
  const positions = scalePositions(keyName, scaleType, tuning)
  const posIndex = Math.min(Math.max(0, Number(position) || 0), positions.length - 1)
  const scales = mode === 'scales'
  const lines = scales && voiced.length ? buildLine(voiced, positions[posIndex].notes, line, tuning) : []
  const { beatTicks } = METER
  const columns = []
  const owner = []
  const starts = []
  const events = []
  let tick = 0
  const chordStyle = CHORD_STYLES.some((c) => c.value === style) ? style : 'strum'

  voiced.forEach(({ chord, notes, beats }, k) => {
    const length = beats * beatTicks
    const first = columns.length
    starts.push(first)
    const sounding = notes.map((n) => ({ string: n.string, fret: n.fret, pitch: n.pitch }))
    if (scales) {
      lines[k].forEach((n, j) => {
        const semis = mod12(n.pitch - chord.rootPc)
        const tone = chord.intervals.some((i) => mod12(i) === semis)
        columns.push({ notes: [{ string: n.string, fret: n.fret }], heading: j === 0 ? chord.name : undefined, groupStart: j === 0 && k > 0, label: tone ? intervalName(semis, chord.intervals) : '' })
        owner.push(k)
        if (playLine) events.push({ notes: [n], tick: tick + j * (beatTicks / 2), column: first + j })
      })
      if (sounding.length) events.push({ notes: sounding, tick, column: first, hold: length })
    } else {
      columns.push({ notes: sounding.map(({ string, fret }) => ({ string, fret })), heading: chord.name, groupStart: k > 0, label: chord.numeral })
      owner.push(k)
      if (sounding.length > 1 && chordStyle === 'arpeggio') {
        const sorted = [...sounding].sort((a, b) => a.pitch - b.pitch)
        const step = Math.max(1, Math.floor(length / sorted.length))
        sorted.forEach((n, i) => events.push({ notes: [n], tick: tick + i * step, column: first }))
      } else if (sounding.length) events.push({ notes: sounding, tick, column: first, ...(sounding.length > 1 && chordStyle === 'strum' ? { strum: 'down' } : {}) })
    }
    tick += length
  })
  events.sort((a, b) => a.tick - b.tick)
  // Round up to whole bars so the click keeps counting in four when the progression loops.
  const totalTicks = Math.max(METER.barTicks, Math.ceil(tick / METER.barTicks) * METER.barTicks)
  const score = finalize({ events, totalTicks }, METER)
  // Under a line, each chord rings for its whole length rather than until the line's next note.
  score.events.forEach((e) => {
    if (e.hold) e.ring = e.hold
  })
  return { voiced, positions, position: posIndex, columns, owner, starts, score }
}

