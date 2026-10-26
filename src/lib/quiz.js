import { FLAT_NAMES, SHARP_NAMES, mod12 } from './theory.js'

// "Find the note" quiz: a random note to find on a given string.

/** Random { string, pc } within `maxFret`, never the same as `previous`. */
export const randomQuestion = (tuning, maxFret, random = Math.random, previous = null) => {
  for (let attempt = 0; ; attempt++) {
    const string = Math.floor(random() * tuning.length)
    const fret = Math.floor(random() * (maxFret + 1))
    const question = { string, pc: mod12(tuning[string] + fret) }
    if (!previous || attempt > 20 || question.string !== previous.string || question.pc !== previous.pc) return question
  }
}

/** Frets on the question's string (up to `maxFret`) that hold the note. */
export const answerFrets = (question, tuning, maxFret) =>
  Array.from({ length: maxFret + 1 }, (_, fret) => fret).filter((fret) => mod12(tuning[question.string] + fret) === question.pc)

export const isCorrect = (question, note, tuning) => note.string === question.string && mod12(tuning[note.string] + note.fret) === question.pc

/** "G" or "C♯ / D♭" for black keys, since either spelling is fair in a quiz. */
export const quizNoteName = (pc) => {
  const sharp = SHARP_NAMES[mod12(pc)]
  const flat = FLAT_NAMES[mod12(pc)]
  return sharp === flat ? sharp : `${sharp.replace('#', '♯')} / ${flat.replace('b', '♭')}`
}
