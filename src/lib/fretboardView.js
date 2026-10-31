// Everything the Fretboard page works out from its settings: the shapes on the neck, the tab columns, headings and
// labels. Kept free of React and the DOM so the web page and the iOS / Android app (mobile/) show exactly the same thing.
import { DROP_VOICINGS, CHORDS, INVERSION_CHORDS, INVERSION_NAMES, SCALES, chordInversions, chordVoicings, diatonicChords, findPositions, intervalName, mod12, noteToPc, pcName, scaleAcrossNeck, scalePosition, sevenNoteScale, spellInterval, spellNotes, usesFlats } from './theory.js'
import { LAYOUTS, parseProgression, voiceProgression } from './exercises.js'

// One switch for what the neck shows. Everything else on the page follows from the key, the scale and this.
export const VIEWS = [
  { value: 'scale', label: 'Scale', title: 'The scale in each position, or the whole neck' },
  { value: 'chord', label: 'Chords', title: 'Full chord shapes up the neck for a chord in the key' },
  { value: 'inversion', label: 'Inversions', title: 'Triads and drop-2 / drop-3 7th chords on each string set' },
  { value: 'progression', label: 'Progressions', title: 'A chord progression in the key, voiced close together' },
]
export const VIEW_IDS = VIEWS.map((v) => v.value)
export const LABEL_OPTIONS = [
  { value: 'notes', label: 'Notes' },
  { value: 'intervals', label: 'Intervals' },
]
export const LAYOUT_OPTIONS = Object.entries(LAYOUTS).map(([value, l]) => ({ value, label: l.name, title: l.title }))
export const DROP_OPTIONS = Object.entries(DROP_VOICINGS).map(([value, d]) => ({ value, label: d.name, title: d.title }))
export const AREA_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'middle', label: 'Fret 5' },
  { value: 'high', label: 'Fret 8' },
]
export const LEGEND = [
  ['root', 'Root'],
  ['third', '3rd'],
  ['fifth', '5th'],
  ['seventh', '7th'],
  ['other', 'Other'],
]
export const ALL_POSITIONS = 'all'
const INVERSION_SHORT = ['R', '1st', '2nd', '3rd']
// Chord types with a clean inversion system on adjacent strings (every chord a seven-note scale can build is here).
export const INVERSION_TYPES = [...INVERSION_CHORDS, 'augMaj7']
const LEVELS = { faint: 0, path: 1, shape: 2, active: 3 }
const MINOR_MODES = ['minor', 'dorian', 'phrygian', 'locrian', 'harmonicMinor', 'melodicMinor']

const minFret = (notes) => Math.min(...notes.map((n) => n.fret))
const fretRange = (notes) => {
  const frets = notes.map((n) => n.fret)
  const lo = Math.min(...frets)
  const hi = Math.max(...frets)
  return lo === hi ? `fr ${lo}` : `fr ${lo}–${hi}`
}
const shapeHint = (notes) => (!notes.length ? '' : notes.some((n) => n.fret === 0) ? 'open' : `fr ${minFret(notes)}`)
// The voicing searches are the only slow part of the page; remember recent results so stepping through the tab is instant.
const cache = new Map()
const remember = (key, compute) => {
  if (!cache.has(key)) {
    if (cache.size > 200) cache.clear()
    cache.set(key, compute())
  }
  return cache.get(key)
}

// A chord from the key's strip as a progression writes it (♭VII → bVII; the parser has no +maj7, so III+ stands in).
export const progressionToken = (chord) => chord.numeral.replace('♭', 'b').replace('♯', '#').replace('+maj7', '+')

/** Whether the key and mode read as minor, for the random progression button. */
export const progressionMood = (scaleType) => (MINOR_MODES.includes(sevenNoteScale(scaleType)) ? 'minor' : 'major')

/**
 * Works out the page from its settings:
 * { view, keyName, scaleType, chordDegree, chordOverride, sevenths, drop, layout, position, stringSet, progression, area, tuning, tuningId }.
 */
export function fretboardView(s) {
  const { keyName, scaleType, sevenths, drop, layout, position, stringSet, progression, area, tuning, tuningId } = s
  const view = VIEW_IDS.includes(s.view) ? s.view : 'scale'
  const keyPc = noteToPc(keyName)
  const scale = SCALES[scaleType] ?? SCALES.major
  const scaleSpelling = spellNotes(keyName, scale.intervals, true)
  const modeId = sevenNoteScale(scaleType)

  // Chords and inversions are picked from the key: the strip chooses the chord (ii, V…), the type can be changed.
  const diatonic = diatonicChords(keyName, scaleType, sevenths)
  const picked = diatonic[Math.min(Math.max(0, Number(s.chordDegree) || 0), diatonic.length - 1)]
  const overrideOk = Boolean(CHORDS[s.chordOverride] && (view !== 'inversion' || INVERSION_TYPES.includes(s.chordOverride)))
  const chordType = overrideOk ? s.chordOverride : INVERSION_TYPES.includes(picked.type) || view !== 'inversion' ? picked.type : 'maj'
  const chordDef = CHORDS[chordType]
  const chordSpelling = spellNotes(picked.rootName, chordDef.intervals)
  const chordName = `${picked.rootName}${chordDef.symbol}`
  const isFourNote = chordDef.intervals.length === 4

  // A progression is read token by token so each chord keeps the numeral it was written as.
  const progressionChords = progression
    .split(/[\s,|–—-]+/)
    .filter(Boolean)
    .map((token) => ({ token, chord: parseProgression(token, keyName).chords[0] }))
  const badTokens = progressionChords.filter((c) => !c.chord).map((c) => c.token)
  const goodChords = progressionChords.filter((c) => c.chord)

  const formula = view === 'scale' ? { rootPc: keyPc, intervals: scale.intervals, names: scaleSpelling.names, rootName: scaleSpelling.root } : { rootPc: picked.rootPc, intervals: chordDef.intervals, names: chordSpelling.names, rootName: picked.rootName }
  const { rootPc, intervals } = formula

  const shapes = (() => {
    if (view === 'scale') {
      // "All" always walks the box shapes; the fingering only changes how a single position is played.
      const all = position === ALL_POSITIONS
      const diagonal = layout === 'across' && !all
      const positions = intervals.map((_, degree) => scalePosition(rootPc, intervals, tuning, degree))
      const options = [...positions.map((p, i) => ({ label: `Position ${i + 1}`, hint: fretRange(p) })), { label: 'All', hint: 'whole neck' }]
      if (all) {
        // The tab climbs the neck one shape at a time, and the neck lights the shape being played.
        const order = positions.map((notes, i) => ({ notes, i, lo: minFret(notes) })).sort((a, b) => a.lo - b.lo)
        return {
          options,
          optionIndex: positions.length,
          path: findPositions(tuning, intervals.map((i) => rootPc + i)),
          columns: order.flatMap(({ notes, i }, k) => notes.map((n, j) => ({ notes: [n], shape: notes, heading: j === 0 ? `Position ${i + 1} · ${fretRange(notes)}` : undefined, groupStart: j === 0 && k > 0 }))),
          columnWidth: 28,
          defaultActive: null,
          shape: null,
          all: true,
        }
      }
      const index = Math.min(Number(position) || 0, positions.length - 1)
      const notes = diagonal ? scaleAcrossNeck(rootPc, intervals, tuning, index) : positions[index]
      const run = [...notes, ...notes.slice(0, -1).reverse()]
      return { options, optionIndex: index, path: [], columns: run.map((n) => ({ notes: [n] })), columnWidth: 28, defaultActive: null, shape: notes }
    }
    if (view === 'chord') {
      const voicings = remember(`v|${rootPc}|${intervals}|${tuning}`, () => chordVoicings(rootPc, intervals, tuning))
      return {
        options: [],
        path: [],
        columns: voicings.map((v) => ({ notes: v.notes, label: chordName, sublabel: shapeHint(v.notes) })),
        columnWidth: 70,
        defaultActive: 0,
      }
    }
    if (view === 'inversion') {
      const sets = chordInversions(rootPc, intervals, tuning, drop)
      const index = Math.min(Number(stringSet) || 0, sets.length - 1)
      const set = sets[index]
      const stringNumber = (str) => tuning.length - str
      return {
        options: sets.map((set) => ({ label: `Strings ${set.strings.map(stringNumber).reverse().join('-')}`, hint: '' })),
        optionIndex: index,
        path: set.shapes.flatMap((sh) => sh.notes),
        columns: set.shapes.map((sh, i) => ({ notes: sh.notes, label: INVERSION_SHORT[sh.inversion], sublabel: `fr ${minFret(sh.notes)}`, groupStart: i === 0 })),
        columnWidth: 70,
        defaultActive: 0,
      }
    }
    const chords = goodChords.map((c) => c.chord)
    const voicings = remember(`p|${keyName}|${progression}|${tuning}|${area}`, () => voiceProgression(chords, tuning, area))
    return {
      options: [],
      path: [],
      columns: chords.map((chord, i) => ({ notes: voicings[i], chord, label: chord.name, sublabel: shapeHint(voicings[i]), groupStart: i > 0 && i % 4 === 0 })),
      columnWidth: 70,
      defaultActive: chords.length ? 0 : null,
    }
  })()

  const selection = [view, keyName, scaleType, chordName, tuningId, shapes.optionIndex, layout, drop, progression, area].join('|')

  const heading = {
    scale: { title: `${scaleSpelling.root} ${scale.name}`, sub: shapes.all ? 'whole neck' : `${layout === 'across' ? 'diagonal from ' : ''}position ${shapes.optionIndex + 1}` },
    chord: { title: chordName, sub: `${picked.numeral} in ${keyName} · ${chordDef.name}` },
    inversion: { title: `${chordName} inversions`, sub: `${picked.numeral} in ${keyName} · ${isFourNote ? DROP_VOICINGS[drop].name : 'close triads'}` },
    progression: { title: `Progression in ${keyName}`, sub: goodChords.length ? `${goodChords.length} chords` : 'add some chords' },
  }[view]
  const tabNote = {
    scale: shapes.all ? 'every position, up the neck' : layout === 'across' ? 'up the neck & back' : 'ascending & descending',
    chord: 'voicings up the neck',
    inversion: `${INVERSION_NAMES.slice(0, intervals.length).join(' → ')} moving up the neck`,
    progression: 'one chord per bar, voiced close together',
  }[view]

  // "Practise it": the drill on the Rhythm page that matches what the neck shows.
  const drill =
    view === 'scale'
      ? { name: 'Scale sequences', settings: { exercise: 'scaleSequence', position: shapes.all ? 0 : shapes.optionIndex, layout } }
      : view === 'progression'
        ? { name: 'Strum this progression', settings: { exercise: 'progression', progression: goodChords.map((c) => c.token).join(' ') || 'I V vi IV', sevenths: false } }
        : view === 'inversion' && !isFourNote
          ? { name: 'Triads on a string set', settings: { exercise: 'triadSets', stringSet: shapes.optionIndex, scale7: modeId } }
          : { name: 'Arpeggios through the key', settings: { exercise: 'diatonicArpeggios', arpSize: isFourNote ? 'sevenths' : 'triads', scale7: modeId } }

  return {
    view,
    keyPc,
    modeId,
    picked,
    overrideOk,
    chordType,
    chordName,
    isFourNote,
    badTokens,
    goodChords,
    formula,
    rootPc,
    intervals,
    shapes,
    selection,
    heading,
    tabNote,
    drill,
    typeOptions: Object.entries(CHORDS).filter(([id]) => view !== 'inversion' || INVERSION_TYPES.includes(id)),
  }
}

/** The tab column that is lit: the one picked for this selection, else the view's default. */
export const activeColumnIndex = (model, active) => (active?.selection === model.selection && active.index < model.shapes.columns.length ? active.index : model.shapes.defaultActive)

/** Labels for notes on the neck and in the tab: note names or intervals. */
export function noteLabeller(model, labels, tuning) {
  const { formula, intervals, rootPc } = model
  const flats = usesFlats(formula.rootName)
  const nameOfPc = new Map(intervals.map((i, k) => [mod12(rootPc + i), formula.names[k]]))
  return (n) => {
    // Progression notes carry their own name and degree, read against their own chord.
    if (n.degree !== undefined) return labels === 'intervals' ? n.degree : (n.name ?? pcName(tuning[n.string] + n.fret, flats))
    return labels === 'intervals' ? intervalName(n.interval, intervals) : (nameOfPc.get(mod12(tuning[n.string] + n.fret)) ?? pcName(tuning[n.string] + n.fret, flats))
  }
}

/** The notes to draw on the neck, faintest first, each { string, fret, level, interval | degree+name }. */
export function neckNotes(model, activeIndex, showAll, tuning) {
  const { shapes, intervals, rootPc, view } = model
  const activeColumn = activeIndex === null ? null : shapes.columns[activeIndex]
  const progressionChord = view === 'progression' ? (activeColumn?.chord ?? shapes.columns[0]?.chord) : null
  const intervalOfPc = (pc) => intervals.find((i) => mod12(rootPc + i) === mod12(pc))
  const map = new Map()
  const add = (n, level) => {
    const id = `${n.string}-${n.fret}`
    const existing = map.get(id)
    if (existing && LEVELS[level] <= LEVELS[existing.level]) return
    const note = { string: n.string, fret: n.fret, level }
    if (n.degree !== undefined) Object.assign(note, { degree: n.degree, name: n.name })
    else note.interval = n.interval ?? intervalOfPc(tuning[n.string] + n.fret)
    map.set(id, note)
  }
  if (showAll && !shapes.all) {
    if (progressionChord) {
      // Every tone of the chord being played, so you can see where else it lives on the neck.
      findPositions(tuning, progressionChord.intervals.map((i) => progressionChord.rootPc + i)).forEach((n) => {
        const interval = mod12(tuning[n.string] + n.fret - progressionChord.rootPc)
        add({ ...n, degree: intervalName(interval, progressionChord.intervals), name: spellInterval(progressionChord.rootName, interval, progressionChord.intervals) }, 'faint')
      })
    } else findPositions(tuning, intervals.map((i) => rootPc + i)).forEach((n) => add(n, 'faint'))
  }
  shapes.path.forEach((n) => add(n, 'path'))
  shapes.shape?.forEach((n) => add(n, 'shape'))
  // All positions: until a note plays, every note reads as one full-strength neck.
  if (shapes.all) (activeColumn?.shape ?? shapes.path).forEach((n) => add(n, 'shape'))
  activeColumn?.notes.forEach((n) => add(n, view === 'scale' ? 'active' : 'shape'))
  return [...map.values()].sort((a, b) => LEVELS[a.level] - LEVELS[b.level])
}

/** The note chips above the neck (or the progression's chords, which can be tapped). */
export function headingChips(model, activeIndex) {
  const { view, goodChords, intervals, formula } = model
  return view === 'progression'
    ? goodChords.map((c, i) => ({ key: i, name: c.chord.name, sub: c.token, root: false, on: activeIndex === i, index: i }))
    : intervals.map((i, k) => ({ key: i, name: formula.names[k], sub: intervalName(i, intervals), root: i === 0 }))
}

/** How long each tab column lasts when the tab plays, in ms. */
export const columnDuration = (view, bpm) => (60 / Math.max(30, Math.min(300, Number(bpm) || 100))) * 1000 * (view === 'scale' ? 1 : view === 'progression' ? 4 : 2)

/** The MIDI pitches a tab column sounds. */
export const columnPitches = (col, tuning) => col.notes.map((n) => tuning[n.string] + n.fret)

/** String names for the tab: the high string in lower case, as guitarists write it. */
export const tabStringNames = (tuning, stringName) => tuning.map((_, s) => (s === tuning.length - 1 ? stringName(s).toLowerCase() : stringName(s)))
