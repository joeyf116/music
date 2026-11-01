// The long lists the Fretboard tab and others open in the `choose` sheet (scale, tuning, chord type, progression
// presets), as sections for ChoiceRow / choose().
import { PROGRESSIONS } from '@music/exercises.js'
import { INVERSION_TYPES } from '@music/fretboardView.js'
import { CHORDS, SCALES, TUNING_GROUPS, TUNINGS, tuningNotes } from '@music/theory.js'
import type { ChooseSection } from './choose'

const SCALE_GROUPS: [string, string[]][] = [
  ['Common', ['minorPentatonic', 'majorPentatonic', 'blues', 'majorBlues', 'major', 'minor']],
  ['Modes', ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']],
  ['Minor colours', ['harmonicMinor', 'melodicMinor', 'phrygianDominant']],
]

export const scaleSections = (): ChooseSection<string>[] =>
  SCALE_GROUPS.map(([title, ids]) => ({ title, options: ids.filter((id) => SCALES[id]).map((id) => ({ value: id, label: SCALES[id].name })) }))

export const tuningSections = (): ChooseSection<string>[] =>
  TUNING_GROUPS.map((group) => ({
    title: group,
    options: Object.entries(TUNINGS)
      .filter(([, t]) => t.group === group)
      .map(([id, t]) => ({ value: id, label: t.name, sub: tuningNotes(t) })),
  }))

/** Chord types for the Fretboard's chord and inversion views; '' means "as in the key" (`inKey` is that chord's name). */
export const chordTypeSections = (inKey: string, inversions: boolean): ChooseSection<string>[] => [
  { options: [{ value: '', label: `As in the key (${inKey})` }] },
  {
    title: 'All chord types',
    options: Object.entries(CHORDS)
      .filter(([id]) => !inversions || INVERSION_TYPES.includes(id))
      .map(([id, c]) => ({ value: id, label: c.name, sub: c.symbol || 'major' })),
  },
]

export const progressionSections = (): ChooseSection<string>[] => [{ options: PROGRESSIONS.map((p) => ({ value: p.text, label: p.name, sub: p.text })) }]
