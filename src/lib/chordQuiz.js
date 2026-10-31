// "Name the chord quality" ear training: a chord is played and the player names its quality (major, minor,
// diminished…). Practice starts with two very different sounds and adds closer ones as they become easy.
import { CHORDS, chordVoicings, mod12 } from './theory.js'

export const QUALITIES = [
  { id: 'maj', short: 'Major', feel: 'Bright, happy, settled.', listen: 'The “home” sound of most songs: a major 3rd at the bottom.' },
  { id: 'min', short: 'Minor', feel: 'Darker, sad or serious, but still settled.', listen: 'Major with the middle note one fret lower.' },
  { id: 'dim', short: 'Dim', feel: 'Tense, uneasy, spooky. It wants to move.', listen: 'Minor with the top note squeezed down a fret too: two minor 3rds.' },
  { id: 'aug', short: 'Aug', feel: 'Dreamy and unresolved, like a question.', listen: 'Major with the top note stretched up a fret: two major 3rds. Sounds like it’s rising.' },
  { id: 'sus2', short: 'Sus2', feel: 'Open and airy, neither happy nor sad.', listen: 'No 3rd at all. The 2nd sits close above the root.' },
  { id: 'sus4', short: 'Sus4', feel: 'Hanging, waiting to fall back to major.', listen: 'No 3rd. The 4th wants to drop one fret to the major 3rd.' },
  { id: 'maj7', short: 'Maj7', feel: 'Lush, soft, jazzy, a little wistful.', listen: 'A major chord with a note one fret under the octave shimmering on top.' },
  { id: 'dom7', short: '7', feel: 'Bluesy and punchy. It pulls to resolve.', listen: 'A major chord with a flat 7: the blues sound and the V7 that leads home.' },
  { id: 'min7', short: 'm7', feel: 'Mellow, smooth, soulful.', listen: 'A minor chord with a flat 7: softer and more relaxed than plain minor.' },
  { id: 'm7b5', short: 'm7♭5', feel: 'Dark and yearning, less harsh than dim7.', listen: 'A diminished triad with a flat 7 on top.' },
  { id: 'dim7', short: 'Dim7', feel: 'Very tense and dramatic, the silent-movie villain.', listen: 'Minor 3rds stacked all the way up, so it has no clear home.' },
].map((q) => ({ ...q, name: CHORDS[q.id].name.replace(' (m7♭5)', ''), symbol: CHORDS[q.id].symbol, intervals: CHORDS[q.id].intervals }))

export const qualityInfo = (id) => QUALITIES.find((q) => q.id === id)

// Start with two very different sounds, then add closer ones: research on perceptual learning (and every ear
// training method) finds big contrasts first and fine distinctions later learn fastest.
export const CHORD_PRESETS = [
  { id: 'majmin', label: 'Major vs minor', qualities: ['maj', 'min'] },
  { id: 'triads', label: 'Triads', qualities: ['maj', 'min', 'dim', 'aug'] },
  { id: 'sus', label: '+ sus', qualities: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4'] },
  { id: 'sevenths', label: '7th chords', qualities: ['maj7', 'dom7', 'min7', 'm7b5', 'dim7'] },
  { id: 'all', label: 'All', qualities: QUALITIES.map((q) => q.id) },
]

export const PLAY_STYLES = [
  { value: 'both', label: 'Both', title: 'Notes one at a time, then together' },
  { value: 'arpeggio', label: 'Arpeggio', title: 'Notes one at a time, low to high' },
  { value: 'block', label: 'Strum', title: 'All the notes together' },
]

export const VOICINGS = [
  { value: 'close', label: 'Close', title: 'Root in the bass, chord tones packed close above: the clearest sound' },
  { value: 'guitar', label: 'Guitar shape', title: 'A real chord shape on the guitar, as you’d hear it in a song' },
]

export const ROOT_MODES = [
  { value: 'fixed', label: 'Same root', title: 'Every chord starts on the key’s root, so only the quality changes' },
  { value: 'random', label: 'Any root', title: 'A new root each time' },
]

/** MIDI pitch of a root note in the low-middle guitar register (A2 up to G#3). */
export const rootPitch = (rootPc) => 45 + mod12(rootPc - 9)

/**
 * A random question { quality, rootPc, inversion } from `qualities`. `rootMode` 'fixed' always uses `keyPc`.
 * Never repeats the previous chord exactly when there is any other choice.
 */
export const randomChordQuestion = (qualities, { rootMode = 'fixed', keyPc = 9, inversions = false, previous = null, random = Math.random } = {}) => {
  const list = qualities.length ? qualities : ['maj', 'min']
  const pick = (items) => items[Math.floor(random() * items.length)]
  let question = null
  for (let attempt = 0; attempt < 20; attempt++) {
    const quality = pick(list)
    const rootPc = rootMode === 'random' ? Math.floor(random() * 12) : keyPc
    const inversion = inversions ? Math.floor(random() * qualityInfo(quality).intervals.length) : 0
    question = { quality, rootPc, inversion }
    if (!previous || previous.quality !== quality || previous.rootPc !== rootPc || list.length === 1) return question
  }
  return question
}

/** A guitar shape for a chord in this tuning: [{ string, fret, pitch, interval }], or [] if none is found. */
export const guitarShape = (rootPc, qualityId, tuning) => {
  const shape = chordVoicings(rootPc, qualityInfo(qualityId).intervals, tuning, 1)[0]
  if (!shape) return []
  return shape.frets.map((fret, string) => (fret === null ? null : { string, fret, pitch: tuning[string] + fret, interval: mod12(tuning[string] + fret - rootPc) })).filter(Boolean)
}

/**
 * The pitches to play for a question (low to high), optionally as another quality on the same root (for
 * comparing after an answer). Close voicing: the root (or, for an inversion, another chord tone) in the bass,
 * and the chord in root position an octave up, so every quality sits in the same place and only its colour changes.
 */
export const chordPitches = (question, { voicing = 'close', tuning, quality = question.quality } = {}) => {
  const intervals = qualityInfo(quality).intervals
  if (voicing === 'guitar' && tuning) {
    const shape = guitarShape(question.rootPc, quality, tuning)
    if (shape.length) return shape.map((n) => n.pitch).sort((a, b) => a - b)
  }
  const root = rootPitch(question.rootPc)
  const bass = root + intervals[Math.min(question.inversion ?? 0, intervals.length - 1)]
  return [bass, ...intervals.map((i) => root + 12 + i)]
}

// ---- Game lifecycle ----
// Same flow as the interval quiz: a question is "asking" until it is answered right ("solved") or shown
// ("revealed"). Only the first answer counts towards the score; wrong picks just narrow the choices.

export const chordRoundState = (round) => {
  if (!round.question) return 'empty'
  if (round.guesses.includes(round.question.quality)) return 'solved'
  return round.revealed ? 'revealed' : 'asking'
}

export const initialChordGame = (question, stats = {}) => ({ question, guesses: [], revealed: false, score: { right: 0, tries: 0 }, stats })

const scoreFirst = (game, correct) => {
  const id = game.question.quality
  const stat = game.stats?.[id] ?? { right: 0, tries: 0 }
  return {
    score: { right: game.score.right + (correct ? 1 : 0), tries: game.score.tries + 1 },
    stats: { ...game.stats, [id]: { right: stat.right + (correct ? 1 : 0), tries: stat.tries + 1 } },
  }
}

export function chordGameReducer(game, action) {
  const state = chordRoundState(game)
  const firstTry = game.guesses.length === 0 && !game.revealed
  switch (action.type) {
    case 'guess': {
      if (state !== 'asking' || game.guesses.includes(action.quality)) return game
      const correct = action.quality === game.question.quality
      return { ...game, ...(firstTry ? scoreFirst(game, correct) : {}), guesses: [...game.guesses, action.quality] }
    }
    case 'reveal':
      if (state !== 'asking') return game
      return { ...game, ...(firstTry ? scoreFirst(game, false) : {}), revealed: true }
    case 'next':
      return { ...game, question: action.question, guesses: [], revealed: false }
    case 'resetStats':
      return { ...game, stats: {} }
    default:
      return game
  }
}
