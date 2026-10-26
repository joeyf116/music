import { describe, expect, it } from 'vitest'
import { answerFrets, isCorrect, quizNoteName, randomQuestion } from './quiz.js'
import { TUNINGS } from './theory.js'

const standard = TUNINGS.standard.pitches

describe('quiz', () => {
  it('picks a string and note within the fret range', () => {
    const values = [0.99, 0.5]
    const q = randomQuestion(standard, 12, () => values.shift())
    expect(q.string).toBe(5)
    expect(answerFrets(q, standard, 12)).toContain(6)
  })

  it('does not repeat the previous question', () => {
    const values = [0, 0, 0, 0, 0, 0.1]
    const previous = { string: 0, pc: standard[0] % 12 }
    const q = randomQuestion(standard, 12, () => values.shift() ?? 0.5, previous)
    expect(q).not.toEqual(previous)
  })

  it('finds every fret of the note on the string', () => {
    // G on the low E string: fret 3 and 15.
    expect(answerFrets({ string: 0, pc: 7 }, standard, 22)).toEqual([3, 15])
    expect(answerFrets({ string: 0, pc: 7 }, standard, 12)).toEqual([3])
  })

  it('only accepts the note on the asked string', () => {
    const q = { string: 0, pc: 7 }
    expect(isCorrect(q, { string: 0, fret: 3 }, standard)).toBe(true)
    expect(isCorrect(q, { string: 0, fret: 15 }, standard)).toBe(true)
    expect(isCorrect(q, { string: 1, fret: 10 }, standard)).toBe(false)
    expect(isCorrect(q, { string: 0, fret: 4 }, standard)).toBe(false)
  })

  it('names black keys both ways', () => {
    expect(quizNoteName(7)).toBe('G')
    expect(quizNoteName(1)).toBe('C♯ / D♭')
  })
})
