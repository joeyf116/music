// The lists that open in a sheet (scale, tuning, chord type, progression presets). Each one names the setting it
// changes, so the one picker screen (app/(fretboard)/pick.jsx) can show any of them.
import { PROGRESSIONS } from '@music/exercises.js'
import { INVERSION_TYPES } from '@music/fretboardView.js'
import { CHORDS, SCALES, TUNING_GROUPS, TUNINGS, diatonicChords, tuningNotes } from '@music/theory.js'
import { getPref } from './prefs'

const SCALE_GROUPS = [
  ['Common', ['minorPentatonic', 'majorPentatonic', 'blues', 'majorBlues', 'major', 'minor']],
  ['Modes', ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']],
  ['Minor colours', ['harmonicMinor', 'melodicMinor', 'phrygianDominant']],
]


export const PICKERS = {
  scale: {
    title: 'Scale or mode',
    pref: 'music.scale',
    initial: 'minorPentatonic',
    sections: () => SCALE_GROUPS.map(([title, ids]) => ({ title, options: ids.filter((id) => SCALES[id]).map((id) => ({ value: id, label: SCALES[id].name })) })),
  },
  tuning: {
    title: 'Tuning',
    pref: 'music.tuning',
    initial: 'standard',
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
    pref: 'music.chordType',
    initial: '',
    sections: () => {
      const inversions = getPref('music.mode', 'scale') === 'inversion'
      const chords = diatonicChords(getPref('music.key', 'A'), getPref('music.scale', 'minorPentatonic'), getPref('music.diatonicSevenths', false))
      const picked = chords[Math.min(Number(getPref('music.chordDegree', 0)) || 0, chords.length - 1)]
      return [
        { title: null, options: [{ value: '', label: `As in the key (${CHORDS[picked.type].name})` }] },
        { title: 'All chord types', options: Object.entries(CHORDS).filter(([id]) => !inversions || INVERSION_TYPES.includes(id)).map(([id, c]) => ({ value: id, label: c.name, sub: c.symbol || 'major' })) },
      ]
    },
  },
  progression: {
    title: 'Common progressions',
    pref: 'music.fretProgression',
    initial: 'I V vi IV',
    sections: () => [{ title: null, options: PROGRESSIONS.map((p) => ({ value: p.text, label: p.name, sub: p.text })) }],
  },
}
