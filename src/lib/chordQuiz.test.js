import { describe, expect, it } from 'vitest'
import { CHORD_PRESETS, QUALITIES, chordGameReducer, chordPitches, chordRoundState, guitarShape, initialChordGame, randomChordQuestion, rootPitch } from './chordQuiz.js'

const STANDARD = [40, 45, 50, 55, 59, 64]
const sequence = (...values) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('chord quality quiz', () => {
  it('starts with major vs minor and every preset uses known qualities', () => {
    expect(CHORD_PRESETS[0].qualities).toEqual(['maj', 'min'])
    const ids = QUALITIES.map((q) => q.id)
    for (const p of CHORD_PRESETS) for (const q of p.qualities) expect(ids).toContain(q)
    expect(QUALITIES.find((q) => q.id === 'aug').intervals).toEqual([0, 4, 8])
  })

  it('keeps a fixed root on the key and avoids repeating the last chord', () => {
    const q = randomChordQuestion(['maj', 'min'], { rootMode: 'fixed', keyPc: 2, previous: { quality: 'maj', rootPc: 2 }, random: sequence(0, 0, 0.9) })
    expect(q).toMatchObject({ quality: 'min', rootPc: 2, inversion: 0 })
    const r = randomChordQuestion(['dim'], { rootMode: 'random', random: sequence(0.5) })
    expect(r.rootPc).toBe(6)
  })

  it('voices chords close above a low root so only the quality changes', () => {
    expect(rootPitch(9)).toBe(45)
    expect(rootPitch(8)).toBe(56)
    const q = { quality: 'maj', rootPc: 0, inversion: 0 }
    expect(chordPitches(q)).toEqual([48, 60, 64, 67])
    expect(chordPitches(q, { quality: 'aug' })).toEqual([48, 60, 64, 68])
    // First inversion puts the 3rd in the bass.
    expect(chordPitches({ ...q, inversion: 1 })).toEqual([52, 60, 64, 67])
  })

  it('finds a guitar shape for the chord and plays it in guitar voicing', () => {
    const shape = guitarShape(9, 'min', STANDARD)
    expect(shape.length).toBeGreaterThanOrEqual(3)
    expect(new Set(shape.map((n) => n.interval))).toEqual(new Set([0, 3, 7]))
    expect(chordPitches({ quality: 'min', rootPc: 9 }, { voicing: 'guitar', tuning: STANDARD })).toEqual(shape.map((n) => n.pitch).sort((a, b) => a - b))
  })

  it('scores only the first answer and keeps per-quality stats', () => {
    let game = initialChordGame({ quality: 'min', rootPc: 0, inversion: 0 })
    game = chordGameReducer(game, { type: 'guess', quality: 'maj' })
    expect(chordRoundState(game)).toBe('asking')
    game = chordGameReducer(game, { type: 'guess', quality: 'min' })
    expect(chordRoundState(game)).toBe('solved')
    expect(game.score).toEqual({ right: 0, tries: 1 })
    expect(game.stats.min).toEqual({ right: 0, tries: 1 })
    game = chordGameReducer(game, { type: 'next', question: { quality: 'maj', rootPc: 0, inversion: 0 } })
    game = chordGameReducer(game, { type: 'guess', quality: 'maj' })
    expect(game.score).toEqual({ right: 1, tries: 2 })
    game = chordGameReducer(game, { type: 'next', question: { quality: 'dim', rootPc: 0, inversion: 0 } })
    game = chordGameReducer(game, { type: 'reveal' })
    expect(chordRoundState(game)).toBe('revealed')
    expect(game.score).toEqual({ right: 1, tries: 3 })
  })
})
