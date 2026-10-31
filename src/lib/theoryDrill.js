// Theory drill: build chords from a key's scale, name the chords of a key, and spell any chord from its formula.
// Everything here is plain data and pure functions (no React, no audio) so the web page and the mobile app can
// share it. A question is a list of steps; each step is answered by tapping one option, or a few in order.
import { CHORDS, SCALES, diatonicChords, intervalName, mod12, noteToPc, spellNotes } from './theory.js'

export const DRILLS = [
  { value: 'build', label: 'Build', title: 'Stack a chord from the key’s scale, then name its quality' },
  { value: 'name', label: 'Name', title: 'Name the chords of a key, and find a chord’s number' },
  { value: 'spell', label: 'Spell', title: 'Spell any chord from its formula, or name it from its notes' },
  { value: 'mix', label: 'Mix', title: 'A bit of everything' },
]

// The order of the modes inside their parent major scale (Dorian starts on its 2nd note, and so on).
export const MODES = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian']

export const KEY_SETS = [
  { value: 'major', label: 'Major', scales: ['major'] },
  { value: 'minor', label: 'Minor', scales: ['minor'] },
  { value: 'both', label: 'Both', scales: ['major', 'minor'] },
  { value: 'modes', label: 'Modes', scales: MODES },
]

export const CHORD_SIZES = [
  { value: 'triads', label: 'Triads', title: 'Three-note chords: root, 3rd, 5th' },
  { value: 'sevenths', label: '7ths', title: 'Four-note chords: root, 3rd, 5th, 7th' },
  { value: 'both', label: 'Both' },
]

export const KEY_MODES = [
  { value: 'any', label: 'Any key', title: 'A new key every question' },
  { value: 'fixed', label: 'My key', title: 'Stay in the key picked on the Fretboard page' },
]

// Keys spelled the way they're usually written (Db major, not C# major; G# minor, not Ab minor).
const MAJOR_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const MINOR_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
// Parent major keys for modes, kept to five accidentals or fewer so no mode lands on E# or B#.
const MODE_PARENTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb', 'B']

const MODE_NAMES = { major: 'major', minor: 'minor', dorian: 'Dorian', phrygian: 'Phrygian', lydian: 'Lydian', mixolydian: 'Mixolydian', locrian: 'Locrian' }

export const TRIAD_QUALITIES = ['maj', 'min', 'dim']
export const SEVENTH_QUALITIES = ['maj7', 'dom7', 'min7', 'm7b5']
// Spelling practice also covers chords that don't occur in the major modes.
const SPELL_TRIADS = ['maj', 'min', 'dim', 'aug']
const SPELL_SEVENTHS = ['maj7', 'dom7', 'min7', 'm7b5', 'dim7']

export const QUALITY_LABELS = { maj: 'Major', min: 'Minor', dim: 'Dim', aug: 'Aug', maj7: 'Maj7', dom7: 'Dom7', min7: 'm7', m7b5: 'm7♭5', dim7: 'Dim7' }
export const qualityName = (type) => CHORDS[type].name.replace(' (m7♭5)', '')

// How each chord is put together, in words a guitarist can hold on to.
export const QUALITY_RULES = {
  maj: 'major 3rd + minor 3rd',
  min: 'minor 3rd + major 3rd',
  dim: 'minor 3rd + minor 3rd',
  aug: 'major 3rd + major 3rd',
  maj7: 'major triad + major 7th (one fret under the octave)',
  dom7: 'major triad + ♭7 (two frets under the octave)',
  min7: 'minor triad + ♭7',
  m7b5: 'diminished triad + ♭7',
  dim7: 'diminished triad + ♭♭7 (three minor 3rds)',
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th']
export const ordinal = (n) => ORDINALS[n - 1] ?? `${n}th`
const TONE_NAMES = ['root', '3rd', '5th', '7th']
export const toneName = (index) => TONE_NAMES[index]

/** "E major", "D Dorian". */
export const keyTitle = (root, scaleId) => `${root} ${MODE_NAMES[scaleId] ?? SCALES[scaleId]?.name ?? scaleId}`

/** A chord's formula as degrees ('1', '♭3', '5', '♭7'). */
export const chordFormula = (type) => {
  const intervals = CHORDS[type].intervals
  return intervals.map((i) => (i === 0 ? '1' : intervalName(i, intervals)))
}

/** The 3rds stacked to make a chord, low to high: [{ from, to, semitones, label }]. */
export const stackedThirds = (names, type) => {
  const intervals = CHORDS[type].intervals
  return intervals.slice(1).map((i, k) => {
    const semitones = i - intervals[k]
    return { from: names[k], to: names[k + 1], semitones, label: semitones === 4 ? 'major 3rd' : semitones === 3 ? 'minor 3rd' : `${semitones} frets` }
  })
}

/**
 * Everything to know about one key for the drill: its scale spelled on seven letters, its chords on every degree,
 * and where it sits in its parent major scale. Spelled like the Fretboard's chord strip (diatonicChords).
 */
export const keyInfo = (key, scaleId, sevenths = false) => {
  const chords = diatonicChords(key, scaleId, sevenths)
  const scale = chords.map((c) => c.rootName)
  const modeIndex = MODES.indexOf(scaleId)
  // The parent major key is the scale note `modeIndex` steps below the root: D Dorian → C major.
  const parent = modeIndex > 0 ? scale[(7 - modeIndex) % 7] : null
  return { root: scale[0], scaleId, title: keyTitle(scale[0], scaleId), scale, chords, sevenths, parent, modeIndex }
}

/** Scale positions (0-6) of the chord tones on `degree`: every other note of the scale. */
export const chordTones = (degree, sevenths = false) => (sevenths ? [0, 2, 4, 6] : [0, 2, 4]).map((k) => (degree + k) % 7)

/** One line on how the chords of this key run, e.g. "Major keys always go I ii iii IV V vi vii°." */
export const keyPatternRule = (info) => {
  const numerals = info.chords.map((c) => c.numeral).join(' ')
  if (info.scaleId === 'major') return `Every major key goes ${numerals}: chords 1, 4 and 5 are major, 2, 3 and 6 are minor, 7 is diminished.`
  if (info.scaleId === 'minor') return `Every natural minor key goes ${numerals}: the major-key pattern started on its 6th note (A minor uses the chords of C major).`
  return `${info.title} uses the chords of ${info.parent} major, started on its ${ordinal(info.modeIndex + 1)} note: ${numerals}.`
}

const pick = (items, random) => items[Math.floor(random() * items.length)]
const shuffle = (items, random) => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The same letter one accidental off (F# → F, Bb → B, E → Eb or E#), for "right letter, wrong note" distractors. */
const nudgeAccidental = (name, random) => {
  if (name.length > 1) return name[0]
  return name + (random() < 0.5 ? 'b' : '#')
}

/** A random key for these settings: { root, scaleId }. With keyMode 'fixed' the root is always `keyName`. */
export const randomKey = ({ keys = 'major', keyMode = 'any', keyName = 'C' } = {}, random = Math.random) => {
  const scales = (KEY_SETS.find((k) => k.value === keys) ?? KEY_SETS[0]).scales
  const scaleId = pick(scales, random)
  if (keyMode === 'fixed') return { root: keyName, scaleId }
  if (scaleId === 'major') return { root: pick(MAJOR_ROOTS, random), scaleId }
  if (scaleId === 'minor') return { root: pick(MINOR_ROOTS, random), scaleId }
  const parent = spellNotes(pick(MODE_PARENTS, random), SCALES.major.intervals).names
  return { root: parent[MODES.indexOf(scaleId)], scaleId }
}

const sizeIsSevenths = (size, random) => (size === 'both' ? random() < 0.5 : size === 'sevenths')

const option = (id, label, sub) => ({ id, label, ...(sub ? { sub } : {}) })
const qualityOptions = (sevenths) => (sevenths ? SEVENTH_QUALITIES : TRIAD_QUALITIES).map((t) => option(t, QUALITY_LABELS[t], qualityName(t)))

/** Build: tap the chord's notes from the key's scale (root first), then say what kind of chord it is. */
export const buildQuestion = (info, degree) => {
  const chord = info.chords[degree]
  const tones = chordTones(degree, info.sevenths)
  const notes = tones.map((t) => info.scale[t])
  const words = info.sevenths ? 'major 7, dominant 7, minor 7 or half-diminished' : 'major, minor or diminished'
  return {
    drill: 'build',
    key: info,
    degree,
    chord: { ...chord, notes },
    prompt: `Build the ${ordinal(degree + 1)} chord in ${info.title}`,
    steps: [
      { kind: 'notes', prompt: `Tap its ${info.sevenths ? 'four' : 'three'} notes, root first.`, options: info.scale.map((name, i) => option(i, name)), answers: tones },
      { kind: 'choice', prompt: `${notes.join(' ')}: is it ${words}?`, options: qualityOptions(info.sevenths), answers: [chord.type] },
    ],
  }
}

/** Name: what is the chord on degree N (four chord names), or which number is this chord (the key's seven numerals)? */
export const nameQuestion = (info, degree, random = Math.random) => {
  const chord = info.chords[degree]
  const notes = chordTones(degree, info.sevenths).map((t) => info.scale[t])
  const base = { drill: 'name', key: info, degree, chord: { ...chord, notes } }
  if (random() < 0.5) {
    const others = (info.sevenths ? SEVENTH_QUALITIES : TRIAD_QUALITIES).filter((t) => t !== chord.type)
    const names = new Set([chord.name])
    for (const t of shuffle(others, random).slice(0, 2)) names.add(chord.rootName + CHORDS[t].symbol)
    names.add(nudgeAccidental(chord.rootName, random) + CHORDS[chord.type].symbol)
    return {
      ...base,
      prompt: `What’s the ${ordinal(degree + 1)} chord in ${info.title}?`,
      steps: [{ kind: 'choice', options: shuffle([...names], random).map((n) => option(n, n)), answers: [chord.name] }],
    }
  }
  return {
    ...base,
    prompt: `In ${info.title}, which chord number is ${chord.name}?`,
    steps: [{ kind: 'choice', options: info.chords.map((c) => option(c.numeral, c.numeral, String(c.degree + 1))), answers: [chord.numeral] }],
  }
}

/** Spell: pick the right notes for a chord symbol, or name the chord from its notes. Any root, any quality. */
export const spellQuestion = (sevenths, random = Math.random) => {
  const pool = sevenths ? SPELL_SEVENTHS : SPELL_TRIADS
  const plain = (names) => !names.some((n) => /##|bb/.test(n))
  let type, root, spell, others
  // Keep to chords (and wrong answers) that need no double sharps or flats: Db dim (Db Fb Abb) is right but unhelpful.
  for (let attempt = 0; attempt < 30; attempt++) {
    type = pick(pool, random)
    root = pick(MAJOR_ROOTS, random)
    spell = (t) => spellNotes(root, CHORDS[t].intervals).names
    others = pool.filter((t) => t !== type && plain(spell(t)))
    if (plain(spell(type)) && others.length >= 2) break
  }
  others = shuffle(others, random).slice(0, 3)
  const notes = spell(type)
  const name = root + CHORDS[type].symbol
  const chord = { type, rootName: root, rootPc: noteToPc(root), name, notes, intervals: CHORDS[type].intervals }
  if (random() < 0.5) {
    const choices = shuffle([type, ...others], random).map((t) => spell(t).join(' '))
    return { drill: 'spell', chord, prompt: `Spell ${name}`, steps: [{ kind: 'choice', options: choices.map((c) => option(c, c)), answers: [notes.join(' ')] }] }
  }
  const choices = shuffle([type, ...others], random).map((t) => root + CHORDS[t].symbol)
  return { drill: 'spell', chord, prompt: `Which chord is ${notes.join(' ')}?`, steps: [{ kind: 'choice', options: choices.map((c) => option(c, c)), answers: [name] }] }
}

/**
 * A new question for these settings: { drill, keys, size, keyMode, keyName }. Avoids asking exactly the same thing
 * twice in a row when there is any other choice.
 */
export const randomDrillQuestion = (settings = {}, { previous = null, random = Math.random } = {}) => {
  const { drill = 'build', size = 'triads' } = settings
  let question = null
  for (let attempt = 0; attempt < 20; attempt++) {
    const kind = drill === 'mix' ? pick(['build', 'name', 'spell'], random) : drill
    const sevenths = sizeIsSevenths(size, random)
    if (kind === 'spell') question = spellQuestion(sevenths, random)
    else {
      const { root, scaleId } = randomKey(settings, random)
      const info = keyInfo(root, scaleId, sevenths)
      const degree = Math.floor(random() * 7)
      question = kind === 'name' ? nameQuestion(info, degree, random) : buildQuestion(info, degree)
    }
    if (!previous || previous.prompt !== question.prompt) return question
  }
  return question
}

/**
 * A nudge after a wrong tap while building, that teaches the method rather than just giving the answer:
 * find the root by counting up the scale, then skip one note for each next chord tone.
 */
export const buildHint = (question, progress) => {
  const { key, degree } = question
  const tones = question.steps[0].answers
  if (progress === 0) return `Count up ${key.title} (${key.scale.join(' ')}): the ${ordinal(degree + 1)} note is the root.`
  const from = key.scale[tones[progress - 1]]
  const skipped = key.scale[(tones[progress - 1] + 1) % 7]
  return `Skip one note each time: from ${from}, jump over ${skipped} to find the ${toneName(progress)}.`
}

/** A nudge after a wrong pick on a multiple-choice step: the rule to use, not the answer. */
export const choiceHint = (question) => {
  const { chord, key, degree } = question
  const rule = `${qualityName(chord.type)} = ${chordFormula(chord.type).join(' ')} (${QUALITY_RULES[chord.type]}).`
  if (question.drill === 'build') return 'Count the frets from each note to the next: 4 frets is a major 3rd, 3 frets a minor 3rd.'
  if (question.drill === 'spell') return question.prompt.startsWith('Spell') ? `${rule} Count up from ${chord.rootName}, one letter for each 3rd.` : `Count the frets between the notes, starting from ${chord.rootName}.`
  if (question.steps[0].answers[0] === chord.name) return `Count up ${key.title} (${key.scale.join(' ')}) to the ${ordinal(degree + 1)} note, then stack every other note.`
  return `Count up ${key.title} (${key.scale.join(' ')}) until you reach ${chord.rootName}.`
}

// ---- Game lifecycle ----
// A question is "asking" until every step is answered ("solved") or the answer is shown ("revealed"). A question
// only scores if it was solved with no wrong taps. Wrong taps are remembered per step so their buttons can be marked.

export const drillState = (game) => {
  if (!game.question) return 'empty'
  if (game.revealed) return 'revealed'
  return game.step >= game.question.steps.length ? 'solved' : 'asking'
}

export const initialDrill = (question) => ({ question, step: 0, progress: 0, wrong: [], missed: false, revealed: false, score: { right: 0, tries: 0 } })

/** The options already answered correctly in step `index` (all of them once the step is done). */
export const pickedIn = (game, index) => {
  const step = game.question?.steps[index]
  if (!step) return []
  if (index < game.step || drillState(game) !== 'asking') return step.answers
  return index === game.step ? step.answers.slice(0, game.progress) : []
}

export function drillReducer(game, action) {
  const state = drillState(game)
  switch (action.type) {
    case 'guess': {
      if (state !== 'asking') return game
      const step = game.question.steps[game.step]
      if (step.answers.slice(0, game.progress).includes(action.id) || game.wrong.includes(action.id)) return game
      if (action.id !== step.answers[game.progress]) return { ...game, wrong: [...game.wrong, action.id], missed: true }
      const stepDone = game.progress + 1 === step.answers.length
      const next = stepDone ? { step: game.step + 1, progress: 0, wrong: [] } : { progress: game.progress + 1, wrong: [] }
      const solved = stepDone && game.step + 1 === game.question.steps.length
      const score = solved ? { right: game.score.right + (game.missed ? 0 : 1), tries: game.score.tries + 1 } : game.score
      return { ...game, ...next, score }
    }
    case 'reveal':
      if (state !== 'asking') return game
      return { ...game, revealed: true, score: { ...game.score, tries: game.score.tries + 1 } }
    case 'next':
      return { ...game, question: action.question, step: 0, progress: 0, wrong: [], missed: false, revealed: false }
    default:
      return game
  }
}

/** Close-voiced pitches for hearing a drill chord (root around C3–B3). */
export const drillChordPitches = (chord) => {
  const root = 48 + mod12(chord.rootPc)
  return chord.intervals.map((i) => root + i)
}
