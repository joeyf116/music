// The lists that open in a sheet (scale, tuning, chord type, progression presets). Each one names the setting it
// changes, so the one picker screen (app/(fretboard)/pick.tsx) can show any of them.
import { PROGRESSIONS } from '@music/exercises.js'
import { INVERSION_TYPES } from '@music/fretboardView.js'
import { CHORDS, SCALES, TUNING_GROUPS, TUNINGS, diatonicChords, tuningNotes } from '@music/theory.js'
import { getPref, type StringPrefKey } from './prefs'

export interface PickerOption {
  value: string
  label: string
  sub?: string
}
export interface PickerSection {
  title: string | null
  options: PickerOption[]
}
export interface Picker {
  title: string
  pref: StringPrefKey
  sections: () => PickerSection[]
}

const SCALE_GROUPS: [string, string[]][] = [
  ['Common', ['minorPentatonic', 'majorPentatonic', 'blues', 'majorBlues', 'major', 'minor']],
  ['Modes', ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']],
  ['Minor colours', ['harmonicMinor', 'melodicMinor', 'phrygianDominant']],
]

export const PICKERS = {
  scale: {
    title: 'Scale or mode',
    pref: 'music.scale' as const,
    sections: () => SCALE_GROUPS.map(([title, ids]) => ({ title, options: ids.filter((id) => SCALES[id]).map((id) => ({ value: id, label: SCALES[id].name })) })),
  },
  tuning: {
    title: 'Tuning',
    pref: 'music.tuning' as const,
    sections: () =>
      TUNING_GROUPS.map((group) => ({
        title: group,
        options: Object.entries(TUNINGS)
          .filter(([, t]) => t.group === group)
          .map(([id, t]) => ({ value: id, label: t.name, sub: tuningNotes(t) })),
      })),
  },
  chordType: {
    title: 'Chord type',
    pref: 'music.chordType' as const,
    sections: () => {
      const inversions = getPref('music.mode') === 'inversion'
      const chords = diatonicChords(getPref('music.key'), getPref('music.scale'), getPref('music.diatonicSevenths'))
      const picked = chords[Math.min(Number(getPref('music.chordDegree')) || 0, chords.length - 1)]
      return [
        { title: null, options: [{ value: '', label: `As in the key (${CHORDS[picked.type].name})` }] },
        { title: 'All chord types', options: Object.entries(CHORDS).filter(([id]) => !inversions || INVERSION_TYPES.includes(id)).map(([id, c]) => ({ value: id, label: c.name, sub: c.symbol || 'major' })) },
      ]
    },
  },
  progression: {
    title: 'Common progressions',
    pref: 'music.fretProgression' as const,
    sections: () => [{ title: null, options: PROGRESSIONS.map((p) => ({ value: p.text, label: p.name, sub: p.text })) }],
  },
} satisfies Record<string, Picker>

export type PickerId = keyof typeof PICKERS

export const isPickerId = (id: unknown): id is PickerId => typeof id === 'string' && id in PICKERS
