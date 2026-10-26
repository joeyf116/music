// "Guess the interval" ear-training quiz: a root is shown on the neck, two notes are played,
// and the player names the distance between them.

export const INTERVALS = [
  { semitones: 1, short: 'm2', name: 'Minor 2nd', song: 'Jaws' },
  { semitones: 2, short: 'M2', name: 'Major 2nd', song: 'Happy Birthday' },
  { semitones: 3, short: 'm3', name: 'Minor 3rd', song: 'Greensleeves' },
  { semitones: 4, short: 'M3', name: 'Major 3rd', song: 'When the Saints Go Marching In' },
  { semitones: 5, short: 'P4', name: 'Perfect 4th', song: 'Here Comes the Bride' },
  { semitones: 6, short: 'TT', name: 'Tritone', song: 'The Simpsons theme' },
  { semitones: 7, short: 'P5', name: 'Perfect 5th', song: 'Star Wars main theme' },
  { semitones: 8, short: 'm6', name: 'Minor 6th', song: 'The Entertainer (3rd to 4th note)' },
  { semitones: 9, short: 'M6', name: 'Major 6th', song: 'My Bonnie Lies Over the Ocean' },
  { semitones: 10, short: 'm7', name: 'Minor 7th', song: 'Star Trek (original theme)' },
  { semitones: 11, short: 'M7', name: 'Major 7th', song: 'Take On Me (chorus)' },
  { semitones: 12, short: 'P8', name: 'Octave', song: 'Somewhere Over the Rainbow' },
]

// Start with a few far-apart intervals and add the close ones once those feel easy.
export const PRESETS = [
  { id: 'starter', label: 'Starter', semitones: [4, 7, 12] },
  { id: 'thirds', label: '+ 3rds & 4th', semitones: [3, 4, 5, 7, 12] },
  { id: 'all', label: 'All', semitones: INTERVALS.map((i) => i.semitones) },
]

export const DIRECTIONS = [
  { id: 'up', label: 'Up' },
  { id: 'down', label: 'Down' },
  { id: 'together', label: 'Together' },
  { id: 'mixed', label: 'Mixed' },
]

export const intervalInfo = (semitones) => INTERVALS.find((i) => i.semitones === semitones)

// Second notes stay within a hand's reach of the root, so the answer is a shape you could play.
const REACH = 5

/** Every { string, fret } up to `maxFret` that sounds `pitch`, nearest to `near` first. */
export const positionsOf = (pitch, tuning, maxFret, near = null) =>
  tuning
    .map((open, string) => ({ string, fret: pitch - open }))
    .filter((p) => p.fret >= 0 && p.fret <= maxFret)
    .sort((a, b) => (near ? Math.abs(a.fret - near.fret) - Math.abs(b.fret - near.fret) : 0))

/**
 * Random question { root, target, semitones, direction } using one of `semitones`. `direction`
 * 'mixed' picks up or down. Never repeats `previous` exactly; returns null if nothing fits the neck.
 */
export const randomQuestion = (tuning, maxFret, semitones, direction, random = Math.random, previous = null) => {
  const pick = (list) => list[Math.floor(random() * list.length)]
  let fallback = null
  for (let attempt = 0; attempt < 60; attempt++) {
    const size = pick(semitones)
    const dir = direction === 'mixed' ? pick(['up', 'down']) : direction
    const string = Math.floor(random() * tuning.length)
    const root = { string, fret: Math.floor(random() * (maxFret + 1)) }
    const rootPitch = tuning[string] + root.fret
    const targetPitch = rootPitch + (dir === 'down' ? -size : size)
    const reachable = positionsOf(targetPitch, tuning, maxFret, root).filter((p) => p.string !== root.string || p.fret !== root.fret)
    const close = reachable.filter((p) => Math.abs(p.fret - root.fret) <= REACH)
    if (!reachable.length) continue
    const target = pick(close.length ? close : reachable)
    const question = { root, target, semitones: size, direction: dir }
    const same = previous && previous.semitones === size && previous.root.string === root.string && previous.root.fret === root.fret
    if (!same) return question
    fallback = question
  }
  return fallback
}

export const pitchesOf = (question, tuning) => [tuning[question.root.string] + question.root.fret, tuning[question.target.string] + question.target.fret]

/** Short label like "M3 ↑" for the answer reveal. */
export const answerLabel = (question) => `${intervalInfo(question.semitones).short} ${question.direction === 'down' ? '↓' : question.direction === 'up' ? '↑' : ''}`.trim()


// ---- Game lifecycle ----
// Each question is "asking" until the right interval is picked ("solved") or the answer is shown
// ("revealed"). Only the first answer to a question is scored; wrong picks just narrow the choices.

export const newRound = (question) => ({ question, guesses: [], revealed: false })

export const roundState = (round) => {
  if (!round.question) return 'empty'
  if (round.guesses.includes(round.question.semitones)) return 'solved'
  return round.revealed ? 'revealed' : 'asking'
}

export const initialGame = (question, { stats = {}, best = 0 } = {}) => ({ ...newRound(question), score: { right: 0, tries: 0 }, streak: 0, best, stats })

/** Counts one first-try result in the score, streak, best streak and per-interval `stats`. */
const scoreFirstTry = (game, correct) => {
  const size = game.question.semitones
  const stat = game.stats?.[size] ?? { right: 0, tries: 0 }
  const streak = correct ? game.streak + 1 : 0
  return {
    score: { right: game.score.right + (correct ? 1 : 0), tries: game.score.tries + 1 },
    streak,
    best: Math.max(game.best ?? 0, streak),
    stats: { ...game.stats, [size]: { right: stat.right + (correct ? 1 : 0), tries: stat.tries + 1 } },
  }
}

export function gameReducer(game, action) {
  const state = roundState(game)
  const firstTry = game.guesses.length === 0 && !game.revealed
  switch (action.type) {
    case 'guess': {
      if (state !== 'asking' || game.guesses.includes(action.size)) return game
      const correct = action.size === game.question.semitones
      return { ...game, ...(firstTry ? scoreFirstTry(game, correct) : {}), guesses: [...game.guesses, action.size] }
    }
    case 'reveal':
      if (state !== 'asking') return game
      return { ...game, ...(firstTry ? scoreFirstTry(game, false) : { streak: 0 }), revealed: true }
    case 'next':
      // Skipping an unanswered question doesn't score, but it does end the streak.
      return { ...game, ...newRound(action.question), streak: state === 'asking' && game.question ? 0 : game.streak }
    case 'resetStats':
      return { ...game, stats: {} }
    default:
      return game
  }
}
