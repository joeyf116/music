import { describe, expect, it } from 'vitest'
import { PRESETS, answerLabel, intervalInfo, pitchesOf, positionsOf, randomQuestion } from './intervalQuiz.js'
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
