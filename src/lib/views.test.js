import { describe, expect, it } from 'vitest'
import { chordQuizText, initialChordGame, chordGameReducer, toggleQuality } from './chordQuiz.js'
import { gameReducer, initialGame, intervalQuizText, stringOrdinal, toggleInterval } from './intervalQuiz.js'
import { metronomeSettings, metronomeStatus } from './rhythmView.js'
import { drillFeedback, initialDrill, buildQuestion, keyInfo } from './theoryDrill.js'

describe('rhythm view', () => {
  it('fills saved metronome settings and fits accents', () => {
    const s = metronomeSettings({ meter: '3/4', gap: { on: true } })
    expect(s.accents).toEqual(['accent', 'beat', 'beat'])
    expect(s.gap).toEqual({ on: true, play: 2, mute: 2 })
    expect(metronomeStatus({ bar: -1, beat: 1 }, s)).toBe('Count-in 2…')
  })
})

describe('quiz words', () => {
  it('says what a wrong and a right chord answer mean', () => {
    let game = initialChordGame({ quality: 'min', rootPc: 9, inversion: 0 })
    game = chordGameReducer(game, { type: 'guess', quality: 'maj' })
    expect(chordQuizText(game, 'A').feedback).toBe('Not major. Press Play to hear it again.')
    game = chordGameReducer(game, { type: 'guess', quality: 'min' })
    expect(chordQuizText(game, 'A').feedback).toMatch(/^Got it\. Am is a minor chord/)
    expect(toggleQuality(['maj', 'min'], 'min')).toBeNull()
  })
  it('names intervals and strings', () => {
    let game = initialGame({ root: { string: 5, fret: 0 }, target: { string: 5, fret: 7 }, semitones: 7, direction: 'up' })
    game = gameReducer(game, { type: 'guess', size: 7 })
    expect(intervalQuizText(game).feedback).toBe('Correct! That\'s a perfect 5th, 7 frets apart. Think “Star Wars main theme”.')
    expect(stringOrdinal(0, 6)).toBe('6th string')
    expect(toggleInterval([4], 4)).toBeNull()
  })
  it('starts a build question with its first step', () => {
    const q = buildQuestion(keyInfo('C', 'major'), 1)
    expect(drillFeedback(initialDrill(q))).toBe('Tap its three notes, root first.')
  })
})
