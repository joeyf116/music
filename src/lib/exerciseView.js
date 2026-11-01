// What the scale & chord drills (Rhythm → Drills) show, worked out from a built exercise: the settings that exercise
// uses, the tab columns, the notes on the neck and the title. Shared by the web page (components/Exercises.jsx) and the
// app, so both offer the same controls with the same options.
import { CHORD_LENGTHS, CHROMATIC_PATTERNS, EXERCISES, LAYOUTS, METERS, NECK_AREAS, PICKING, RATES, SEQUENCES, STRUMS, rateFits } from './exercises.js'
import { CHORDS, SCALES, noteToPc, pcName, scalePosition, spellNotes, stringSets, usesFlats } from './theory.js'

export const EXERCISE_GROUPS = [...new Set(EXERCISES.map((e) => e.group))]
export const SPEED_UPS = [0, 2, 5, 10]
const SEVEN_NOTE_SCALES = Object.entries(SCALES).filter(([, s]) => s.intervals.length === 7)
const INVERSIONS = ['Root', '1st', '2nd']
const ARP_DIRECTIONS = [
  { value: 'up', label: 'Up' },
  { value: 'updown', label: 'Up & down' },
  { value: 'alternate', label: 'Alternate', title: 'Alternate up / down' },
]
const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
// Tab column width by the shortest note in the exercise, so 16ths pack tighter than quarters.
const COLUMN_WIDTHS = { 2: 20, 3: 22, 4: 24, 6: 26, 12: 34 }

const fretHint = (notes) => {
  const frets = notes.map((n) => n.fret)
  return `fr ${Math.min(...frets)}–${Math.max(...frets)}`
}
const entries = (table) => Object.entries(table).map(([value, t]) => ({ value, label: t.name }))

/** The exercises as grouped options: [{ group, options: [{ value, label }] }]. */
export const exerciseMenu = () => EXERCISE_GROUPS.map((group) => ({ group, options: EXERCISES.filter((e) => e.group === group).map((e) => ({ value: e.id, label: e.name })) }))

/**
 * The settings the current exercise uses, in page order. Each is { id, label, kind, value, options } where kind is
 * 'select' (a list), 'choice' (a few buttons) or 'stepper' (a number with min/max). Option values have the type
 * the setting stores (numbers stay numbers), so a control can pass them straight back to `set({ [id]: value })`.
 */
export const exerciseFields = (score, tuning, stringName) => {
  const { exercise, meter } = score
  const s = score.settings
  const has = (control) => exercise.controls.includes(control)
  const sets = stringSets(3, tuning.length)
  const fields = []
  const add = (control, field) => has(control) && fields.push({ id: control, ...field })
  add('scale', { label: 'Scale', kind: 'select', value: s.scale, options: entries(SCALES), resetsPosition: true })
  add('scale7', { label: 'Scale', kind: 'select', value: s.scale7, options: SEVEN_NOTE_SCALES.map(([value, sc]) => ({ value, label: sc.name })) })
  add('chord', { label: 'Chord', kind: 'select', value: s.chord, options: entries(CHORDS), resetsPosition: true })
  add('sequence', { label: 'Pattern', kind: 'select', value: s.sequence, options: entries(SEQUENCES) })
  add('string', { label: 'String', kind: 'select', value: Math.min(s.string, tuning.length - 1), options: tuning.map((_, i) => ({ value: i, label: `${ORDINALS[tuning.length - i]} (${stringName(i)})` })) })
  add('fingers', { label: 'Finger order', kind: 'select', value: s.fingers, options: CHROMATIC_PATTERNS.map((p) => ({ value: p, label: [...p].join('-') })) })
  add('startFret', { label: 'Start fret', kind: 'stepper', value: s.startFret, min: 1, max: 19, fallback: 5 })
  add('arpSize', {
    label: 'Chords',
    kind: 'choice',
    value: s.arpSize,
    options: [
      { value: 'triads', label: 'Triads' },
      { value: 'sevenths', label: '7th chords' },
    ],
  })
  add('arpDirection', { label: 'Direction', kind: 'choice', value: s.arpDirection, options: ARP_DIRECTIONS })
  add('stringSet', {
    label: 'Strings',
    kind: 'select',
    value: Math.min(s.stringSet, sets.length - 1),
    options: sets.map((strings, i) => ({ value: i, label: `${strings.map((st) => stringName(st)).join(' ')} (${strings.map((st) => tuning.length - st).reverse().join('-')})` })),
  })
  add('inversion', { label: 'Inversion', kind: 'choice', value: Number(s.inversion), options: INVERSIONS.map((label, i) => ({ value: i, label })) })
  add('triadStyle', {
    label: 'Played as',
    kind: 'choice',
    value: s.triadStyle,
    options: [
      { value: 'arpeggio', label: 'Arpeggiated' },
      { value: 'block', label: 'Block chords' },
    ],
  })
  add('sevenths', {
    label: 'Chord type',
    kind: 'choice',
    value: Boolean(s.sevenths),
    options: [
      { value: false, label: 'As written' },
      { value: true, label: '7th chords' },
    ],
  })
  add('chordLength', { label: 'Each chord', kind: 'select', value: Number(s.chordLength), options: Object.entries(CHORD_LENGTHS).map(([value, c]) => ({ value: Number(value), label: c.name })) })
  add('neck', { label: 'Voicings', kind: 'select', value: s.neck, options: entries(NECK_AREAS) })
  add('strum', { label: 'Strum', kind: 'select', value: s.strum, options: entries(STRUMS) })
  add('picking', { label: 'Picking', kind: 'select', value: s.picking, options: entries(PICKING) })
  add('rate', { label: 'Note value', kind: 'select', value: s.rate, options: Object.entries(RATES).map(([value, r]) => ({ value, label: r.name, disabled: !rateFits(value, meter) })) })
  fields.push({ id: 'meter', label: 'Time signature', kind: 'select', value: meter.id, options: Object.keys(METERS).map((id) => ({ value: id, label: id })) })
  return fields
}

/** The fingering choice (box or diagonal) when the exercise has one. */
export const exerciseLayoutField = (score) =>
  score.exercise.controls.includes('layout')
    ? { id: 'layout', label: 'Fingering', kind: 'choice', value: LAYOUTS[score.settings.layout] ? score.settings.layout : 'position', options: Object.entries(LAYOUTS).map(([value, l]) => ({ value, label: l.name, title: l.title })) }
    : null

/** Scale or arpeggio positions as { label, hint (its frets) }, so a position means the same place in either fingering. */
export const exercisePositions = (score, tuning) => {
  const { exercise } = score
  const s = score.settings
  if (!exercise.controls.includes('position')) return []
  const scale = SCALES[exercise.controls.includes('scale7') ? s.scale7 : s.scale] ?? SCALES.major
  const intervals = exercise.id === 'chordArpeggio' ? (CHORDS[s.chord] ?? CHORDS.maj7).intervals : scale.intervals
  const rootPc = noteToPc(s.key)
  return intervals.map((_, i) => ({ label: String(i + 1), hint: fretHint(scalePosition(rootPc, intervals, tuning, i)) }))
}

/** The heading over the tab, e.g. "A Minor Pentatonic: scale sequences". */
export const exerciseTitle = (score) => {
  const { exercise } = score
  const s = score.settings
  const scale = SCALES[exercise.controls.includes('scale7') ? s.scale7 : s.scale] ?? SCALES.major
  if (exercise.id === 'progression' || exercise.id === 'fingerstyle') return `${exercise.name} in ${s.key}`
  if (exercise.id === 'chromatic') return `${exercise.name}: ${s.fingers}`
  if (exercise.id === 'chordArpeggio') return `${s.key}${(CHORDS[s.chord] ?? CHORDS.maj7).symbol} arpeggio`
  return `${spellNotes(s.key, scale.intervals, true).root} ${scale.name}: ${exercise.name.toLowerCase()}`
}

/** True for single-note exercises (their notes get labels and the whole run shows on the neck). */
export const isMelodic = (score) => !score.exercise.controls.includes('progression')

/** A note's name in the exercise's key. */
export const exerciseNoteName = (score, note) => note.name ?? pcName(note.pitch, usesFlats(score.settings.key))

/** Tab columns for the score, labelled with note names or degrees ('notes' | 'degrees'). */
export const exerciseColumns = (score, labels) => {
  const melodic = isMelodic(score)
  return score.events.map((e) => ({
    notes: e.notes,
    heading: e.heading,
    label: e.label ?? (melodic && e.notes.length === 1 ? (labels === 'notes' ? exerciseNoteName(score, e.notes[0]) : e.notes[0].degree) : ''),
    sublabel: e.count,
    groupStart: e.barStart,
  }))
}

export const exerciseColumnWidth = (score) => {
  const { events } = score
  const shortest = Math.min(...events.slice(1).map((e, i) => e.tick - events[i].tick), 12)
  return COLUMN_WIDTHS[shortest] ?? 26
}

/** Notes on the neck: the whole exercise (or the current chord), with the playing note lit. */
export const exerciseNeckNotes = (score, activeIndex) => {
  const { events } = score
  const current = activeIndex === null ? null : events[activeIndex]
  const map = new Map()
  const add = (n, level) => map.set(`${n.string}-${n.fret}`, { ...n, level })
  const shapeSource = isMelodic(score) ? events.flatMap((e) => e.notes) : ((current ?? events[0])?.shape ?? [])
  shapeSource.forEach((n) => add(n, 'shape'))
  current?.notes.forEach((n) => add(n, 'active'))
  return [...map.values()].sort((a, b) => (a.level === 'active') - (b.level === 'active'))
}

/** Label for a note on the neck. */
export const exerciseNeckLabel = (score, labels, note) => (labels === 'notes' || !isMelodic(score) ? exerciseNoteName(score, note) : note.degree)
