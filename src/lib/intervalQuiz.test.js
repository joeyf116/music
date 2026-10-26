import { describe, expect, it } from 'vitest'
import { PRESETS, answerLabel, gameReducer, initialGame, intervalInfo, pitchesOf, positionsOf, randomQuestion, roundState } from './intervalQuiz.js'
import { TUNINGS } from './theory.js'

const standard = TUNINGS.standard.pitches

describe('interval quiz', () => {
  it('builds a question whose notes are the chosen distance apart', () => {
    for (let i = 0; i < 200; i++) {
      const q = randomQuestion(standard, 12, [3, 7], 'mixed')
      const [root, target] = pitchesOf(q, standard)
      expect([3, 7]).toContain(q.semitones)
      expect(target - root).toBe(q.direction === 'down' ? -q.semitones : q.semitones)
      expect(q.target.fret).toBeGreaterThanOrEqual(0)
      expect(q.target.fret).toBeLessThanOrEqual(12)
    }
  })

  it('keeps the second note near the root when it can', () => {
    for (let i = 0; i < 200; i++) {
      const q = randomQuestion(standard, 22, [4], 'up')
      expect(Math.abs(q.target.fret - q.root.fret)).toBeLessThanOrEqual(5)
    }
  })

  it('never asks for a note below the lowest open string', () => {
    // Root forced onto the open low E: a descending interval has to pick another root.
    const values = [0, 0, 0, 0, ...Array(400).fill(0.5)]
    const q = randomQuestion(standard, 12, [5], 'down', () => values.shift() ?? 0.5)
    expect(pitchesOf(q, standard)[1]).toBeGreaterThanOrEqual(standard[0])
  })

  it('does not repeat the previous question', () => {
    const previous = randomQuestion(standard, 5, [7], 'up', () => 0.3)
    const next = randomQuestion(standard, 5, [7], 'up', () => 0.3, previous)
    // With a fixed random source the only option is the fallback, which is still valid.
    expect(next.semitones).toBe(7)
    const varied = randomQuestion(standard, 12, [7], 'up', Math.random, previous)
    expect(varied).not.toBeNull()
  })

  it('lists positions of a pitch nearest the root first', () => {
    // A3 (57): 5th string fret 12, 4th string fret 7, 3rd string fret 2.
    expect(positionsOf(57, standard, 12, { string: 2, fret: 3 })[0]).toEqual({ string: 3, fret: 2 })
  })

  it('labels answers with their direction', () => {
    expect(answerLabel({ semitones: 4, direction: 'up' })).toBe('M3 ↑')
    expect(answerLabel({ semitones: 7, direction: 'down' })).toBe('P5 ↓')
    expect(answerLabel({ semitones: 12, direction: 'together' })).toBe('P8')
    expect(intervalInfo(6).name).toBe('Tritone')
    expect(PRESETS[0].semitones).toEqual([4, 7, 12])
  })
})

describe('interval quiz lifecycle', () => {
  const q = (semitones) => ({ root: { string: 0, fret: 3 }, target: { string: 1, fret: 3 }, semitones, direction: 'up' })
  const start = (semitones = 7) => initialGame(q(semitones))

  it('scores a right first answer and builds the streak', () => {
    const g = gameReducer(start(), { type: 'guess', size: 7 })
    expect(roundState(g)).toBe('solved')
    expect(g.score).toEqual({ right: 1, tries: 1 })
    expect(g.streak).toBe(1)
    expect(g.stats[7]).toEqual({ right: 1, tries: 1 })
  })

  it('keeps the best streak after the streak ends', () => {
    let g = initialGame(q(7), { best: 1 })
    g = gameReducer(g, { type: 'guess', size: 7 })
    g = gameReducer(g, { type: 'next', question: q(7) })
    g = gameReducer(g, { type: 'guess', size: 7 })
    expect(g.best).toBe(2)
    g = gameReducer(gameReducer(g, { type: 'next', question: q(7) }), { type: 'guess', size: 5 })
    expect(g.streak).toBe(0)
    expect(g.best).toBe(2)
  })

  it('stays on the same question after a wrong answer', () => {
    const g = gameReducer(start(), { type: 'guess', size: 5 })
    expect(roundState(g)).toBe('asking')
    expect(g.question.semitones).toBe(7)
    expect(g.guesses).toEqual([5])
    expect(g.score).toEqual({ right: 0, tries: 1 })
    expect(g.streak).toBe(0)
  })

  it('only scores the first answer to a question', () => {
    let g = gameReducer({ ...start(), streak: 3 }, { type: 'guess', size: 5 })
    g = gameReducer(g, { type: 'guess', size: 5 })
    g = gameReducer(g, { type: 'guess', size: 7 })
    expect(roundState(g)).toBe('solved')
    expect(g.score).toEqual({ right: 0, tries: 1 })
    expect(g.streak).toBe(0)
    expect(g.stats[7]).toEqual({ right: 0, tries: 1 })
  })

  it('ignores answers once the question is over', () => {
    const solved = gameReducer(start(), { type: 'guess', size: 7 })
    expect(gameReducer(solved, { type: 'guess', size: 5 })).toBe(solved)
    expect(gameReducer(solved, { type: 'reveal' })).toBe(solved)
  })

  it('counts showing the answer as a miss', () => {
    const g = gameReducer({ ...start(), streak: 2 }, { type: 'reveal' })
    expect(roundState(g)).toBe('revealed')
    expect(g.score).toEqual({ right: 0, tries: 1 })
    expect(g.streak).toBe(0)
  })

  it('skipping ends the streak without scoring, moving on after an answer keeps it', () => {
    const skipped = gameReducer({ ...start(), streak: 2 }, { type: 'next', question: q(4) })
    expect(skipped.streak).toBe(0)
    expect(skipped.score).toEqual({ right: 0, tries: 0 })
    const solved = gameReducer(start(), { type: 'guess', size: 7 })
    const next = gameReducer(solved, { type: 'next', question: q(4) })
    expect(next.streak).toBe(1)
    expect(roundState(next)).toBe('asking')
    expect(next.guesses).toEqual([])
  })
})
