// Everything the Fretboard page works out from its settings: the shapes on the neck, the tab columns, headings and
// labels. Kept free of React and the DOM so the web page and the iOS / Android app (mobile/) show exactly the same thing.
import { CHORDS, PENTATONIC, cagedShapes, INVERSION_CHORDS, INVERSION_NAMES, SCALES, chordInversions, chordVoicings, diatonicChords, findPositions, intervalName, mod12, noteToPc, pcName, scaleAcrossNeck, scalePosition, sevenNoteScale, spellNotes, usesFlats } from './theory.js'
import { LAYOUTS } from './exercises.js'

// One switch for what the neck shows. Everything else on the page follows from the key, the scale and this.
export const VIEWS = [
  { value: 'scale', label: 'Scale', title: 'The scale in each position, or the whole neck' },
  { value: 'chord', label: 'Chords', title: 'Every voicing of a chord in the key, one at a time' },
]
// How a chord is voiced in Chords view. Triads are for three-note chords, drop voicings for 7th chords.
export const VOICING_TYPES = [
  { value: 'shapes', label: 'Shapes', title: 'Full open and barre chord shapes' },
  { value: 'caged', label: 'CAGED', title: 'The five CAGED shapes, each inside its pentatonic box' },
  { value: 'triads', label: 'Triads', title: 'Close triads on each set of three strings' },
  { value: 'drop2', label: 'Drop 2', title: 'Four adjacent strings: the 2nd voice from the top dropped an octave' },
  { value: 'drop3', label: 'Drop 3', title: 'Bass note a string apart from the other three' },
]
export const VIEW_IDS = VIEWS.map((v) => v.value)
export const LABEL_OPTIONS = [
  { value: 'notes', label: 'Notes' },
  { value: 'intervals', label: 'Intervals' },
]
export const LAYOUT_OPTIONS = Object.entries(LAYOUTS).map(([value, l]) => ({ value, label: l.name, title: l.title }))
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
export const MINOR_MODES = ['minor', 'dorian', 'phrygian', 'locrian', 'harmonicMinor', 'melodicMinor']

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

/** Whether a chord's triad is major or minor, for CAGED (null for anything else). */
const triadQuality = (intervals) => {
  const tones = intervals.map(mod12)
  if (intervals.length !== 3 || !tones.includes(7)) return null
  return tones.includes(4) ? 'major' : tones.includes(3) ? 'minor' : null
}

/** The voicing types a chord can be shown in: full shapes always, CAGED for plain major / minor triads, then triads or drop voicings. */
export const voicingTypesFor = (chordType) => {
  const def = CHORDS[chordType]
  if (!def) return VOICING_TYPES.filter((t) => t.value === 'shapes')
  const inversions = INVERSION_TYPES.includes(chordType)
  const four = def.intervals.length === 4
  return VOICING_TYPES.filter(
    (t) =>
      t.value === 'shapes' ||
      (t.value === 'caged' && triadQuality(def.intervals)) ||
      (t.value === 'triads' && inversions && def.intervals.length === 3) ||
      ((t.value === 'drop2' || t.value === 'drop3') && inversions && four),
  )
}

/** The voicing type to use: the stored one if the chord has it, else its nearest relative (triads ↔ drop 2), else full shapes. */
export const resolveVoicingType = (stored, chordType) => {
  const ids = voicingTypesFor(chordType).map((t) => t.value)
  if (ids.includes(stored)) return stored
  if ((stored === 'drop2' || stored === 'drop3') && ids.includes('triads')) return 'triads'
  if (stored === 'triads' && ids.includes('drop2')) return 'drop2'
  return 'shapes'
}

/**
 * Old saved views (before Inversions, CAGED and Progressions became part of Chords) as the view and voicing type
 * they now open as. Returns null for a view that needs no change.
 */
export const legacyView = (mode, drop) =>
  mode === 'inversion'
    ? { view: 'chord', voicingType: drop === 'drop3' ? 'drop3' : 'drop2' }
    : mode === 'caged'
      ? { view: 'chord', voicingType: 'caged' }
      : mode === 'progression'
        ? { view: 'chord', voicingType: 'shapes', progression: true }
        : null

const stringNumbers = (strings, tuning) =>
  strings
    .map((s) => tuning.length - s)
    .reverse()
    .join('-')

/**
 * Works out the page from its settings:
 * { view, keyName, scaleType, chordDegree, chordOverride, sevenths, voicingType, voicingIndex, layout, position, tuning, tuningId }.
 * Scale view shows a scale position (or the whole neck); Chords view shows one voicing of a chord in the key at a time.
 * Either way `pin` is what the Pin button adds to the practice tab.
 */
export function fretboardView(s) {
  const { keyName, scaleType, sevenths, layout, position, tuning, tuningId } = s
  const view = VIEW_IDS.includes(s.view) ? s.view : legacyView(s.view)?.view ?? 'scale'
  const keyPc = noteToPc(keyName)
  const scale = SCALES[scaleType] ?? SCALES.major
  const scaleSpelling = spellNotes(keyName, scale.intervals, true)
  const modeId = sevenNoteScale(scaleType)

  // The chord is picked from the key (ii, V…); its type can be changed in Settings.
  const diatonic = diatonicChords(keyName, scaleType, sevenths)
  const picked = diatonic[Math.min(Math.max(0, Number(s.chordDegree) || 0), diatonic.length - 1)]
  const overrideOk = Boolean(CHORDS[s.chordOverride])
  const chordType = overrideOk ? s.chordOverride : picked.type
  const chordDef = CHORDS[chordType]
  const chordSpelling = spellNotes(picked.rootName, chordDef.intervals)
  const chordName = `${picked.rootName}${chordDef.symbol}`
  const isFourNote = chordDef.intervals.length === 4
  const voicingTypes = voicingTypesFor(chordType)
  const voicingType = resolveVoicingType(s.voicingType, chordType)
  const typeName = VOICING_TYPES.find((t) => t.value === voicingType).label
  const quality = triadQuality(chordDef.intervals) ?? 'major'
  const pentatonicSpelling = spellNotes(picked.rootName, PENTATONIC[quality], true)

  const formula =
    view === 'scale'
      ? { rootPc: keyPc, intervals: scale.intervals, names: scaleSpelling.names, rootName: scaleSpelling.root }
      : voicingType === 'caged'
        ? { rootPc: picked.rootPc, intervals: PENTATONIC[quality], names: pentatonicSpelling.names, rootName: pentatonicSpelling.root }
        : { rootPc: picked.rootPc, intervals: chordDef.intervals, names: chordSpelling.names, rootName: picked.rootName }
  const { rootPc, intervals } = formula

  // Chords view: every voicing of the chord in the chosen type, low on the neck to high. Each is
  // { label, hint, notes (the chord shape), path (CAGED: its box), columns (its tab) }.
  const voicings =
    view === 'scale'
      ? []
      : remember(`${voicingType}|${picked.rootPc}|${chordDef.intervals}|${tuning}`, () => {
          if (voicingType === 'caged') {
            return cagedShapes(picked.rootPc, quality, tuning).map((c) => ({
              label: `${c.letter} shape`,
              hint: fretRange(c.box),
              notes: c.chord,
              path: c.box,
              // The chord, then its box up and back.
              columns: [{ notes: c.chord, label: chordName }, ...[...c.box, ...c.box.slice(0, -1).reverse()].map((n) => ({ notes: [n] }))],
              caged: c.letter,
            }))
          }
          if (voicingType === 'shapes') {
            return chordVoicings(picked.rootPc, chordDef.intervals, tuning).map((v, i) => ({
              label: `Shape ${i + 1}`,
              hint: shapeHint(v.notes),
              notes: v.notes,
              columns: [{ notes: v.notes, label: chordName, sublabel: shapeHint(v.notes) }],
            }))
          }
          const drop = voicingType === 'drop3' ? 'drop3' : 'drop2'
          return chordInversions(picked.rootPc, chordDef.intervals, tuning, drop).flatMap((set) =>
            set.shapes.map((sh) => ({
              label: `Strings ${stringNumbers(set.strings, tuning)} · ${INVERSION_NAMES[sh.inversion]}`,
              hint: `fr ${minFret(sh.notes)}`,
              notes: sh.notes,
              columns: [{ notes: sh.notes, label: chordName, sublabel: INVERSION_SHORT[sh.inversion] }],
            })),
          )
        })
  const voicingIndex = Math.min(Math.max(0, Number(s.voicingIndex) || 0), Math.max(0, voicings.length - 1))
  const voicing = voicings[voicingIndex] ?? null

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
    return {
      options: [],
      path: voicing?.path ?? [],
      shape: voicing?.notes ?? [],
      columns: voicing?.columns ?? [],
      columnWidth: voicingType === 'caged' ? 28 : 70,
      defaultActive: voicing ? 0 : null,
      caged: voicingType === 'caged' && voicing ? { all: false, letter: voicing.caged, quality } : undefined,
    }
  })()

  const selection = [view, keyName, scaleType, chordName, tuningId, shapes.optionIndex, layout, voicingType, voicingIndex].join('|')

  const heading =
    view === 'scale'
      ? { title: `${scaleSpelling.root} ${scale.name}`, sub: shapes.all ? 'whole neck' : `${layout === 'across' ? 'diagonal from ' : ''}position ${shapes.optionIndex + 1}` }
      : { title: chordName, sub: `${picked.numeral} in ${keyName} · ${chordDef.name}` }
  const tabNote =
    view === 'scale'
      ? shapes.all
        ? 'every position, up the neck'
        : layout === 'across'
          ? 'up the neck & back'
          : 'ascending & descending'
      : voicingType === 'caged'
        ? 'the chord, then its pentatonic box up & back'
        : ''

  // What Pin adds to the practice tab: the frets themselves, so changing the key later never changes it.
  const strip = (cols) => cols.map((c) => ({ notes: c.notes.map((n) => ({ string: n.string, fret: n.fret })) }))
  const pin =
    view === 'scale'
      ? {
          kind: 'run',
          name: `${scaleSpelling.root} ${scale.name}`,
          detail: shapes.all ? 'Whole neck' : `${layout === 'across' ? 'Diagonal from position' : 'Position'} ${shapes.optionIndex + 1} · ${shapes.options[shapes.optionIndex].hint}`,
          key: keyName,
          tuningId,
          columns: strip(shapes.columns),
        }
      : voicing && {
          kind: voicingType === 'caged' ? 'run' : 'chord',
          name: chordName,
          detail: `${typeName === 'Shapes' ? 'Shape' : typeName} · ${voicingType === 'shapes' ? voicing.hint : `${voicing.label} · ${voicing.hint}`}`,
          key: keyName,
          tuningId,
          columns: strip(voicing.columns),
        }

  return {
    view,
    keyPc,
    modeId,
    picked,
    overrideOk,
    chordType,
    chordName,
    isFourNote,
    formula,
    rootPc,
    intervals,
    shapes,
    selection,
    heading,
    tabNote,
    voicingTypes,
    voicingType,
    voicings: voicings.map((v) => ({ label: v.label, hint: v.hint })),
    voicingIndex,
    pin: pin || null,
    typeOptions: Object.entries(CHORDS),
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
    const pc = mod12(tuning[n.string] + n.fret)
    return labels === 'intervals' ? intervalName(n.interval ?? mod12(pc - rootPc), intervals) : (nameOfPc.get(pc) ?? pcName(pc, flats))
  }
}

/** The notes to draw on the neck, faintest first, each { string, fret, level, interval }. */
export function neckNotes(model, activeIndex, showAll, tuning) {
  const { shapes, intervals, rootPc } = model
  const activeColumn = activeIndex === null ? null : shapes.columns[activeIndex]
  const intervalOfPc = (pc) => intervals.find((i) => mod12(rootPc + i) === mod12(pc))
  const map = new Map()
  const add = (n, level) => {
    const id = `${n.string}-${n.fret}`
    const existing = map.get(id)
    if (existing && LEVELS[level] <= LEVELS[existing.level]) return
    map.set(id, { string: n.string, fret: n.fret, level, interval: n.interval ?? intervalOfPc(tuning[n.string] + n.fret) })
  }
  // CAGED keeps to its box, so the shape you're learning isn't lost among the rest of the neck.
  if (showAll && !shapes.all && !shapes.caged) findPositions(tuning, intervals.map((i) => rootPc + i)).forEach((n) => add(n, 'faint'))
  shapes.path.forEach((n) => add(n, 'path'))
  shapes.shape?.forEach((n) => add(n, 'shape'))
  // All positions: until a note plays, every note reads as one full-strength neck.
  if (shapes.all) (activeColumn?.shape ?? shapes.path).forEach((n) => add(n, 'shape'))
  // A single note being played lights up; a chord column is the shape itself.
  activeColumn?.notes.forEach((n) => add(n, activeColumn.notes.length === 1 ? 'active' : 'shape'))
  return [...map.values()].sort((a, b) => LEVELS[a.level] - LEVELS[b.level])
}

/** How long a tab column lasts when the neck's tab plays, in ms: a beat per note, two per chord. */
export const columnDuration = (column, bpm) => (60 / Math.max(30, Math.min(300, Number(bpm) || 100))) * 1000 * (column.notes.length > 1 ? 2 : 1)

/** The MIDI pitches a tab column sounds. */
export const columnPitches = (col, tuning) => col.notes.map((n) => tuning[n.string] + n.fret)

/** String names for the tab: the high string in lower case, as guitarists write it. */
export const tabStringNames = (tuning, stringName) => tuning.map((_, s) => (s === tuning.length - 1 ? stringName(s).toLowerCase() : stringName(s)))
