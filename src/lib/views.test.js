import { describe, expect, it } from 'vitest'
import { barTokens, catalogCharts, chartShelves, filterCharts, moveSection, nextSection, spreadBars, transposeText } from './chartView.js'
import { chordQuizText, initialChordGame, chordGameReducer, toggleQuality } from './chordQuiz.js'
import { buildExercise } from './exercises.js'
import { exerciseColumns, exerciseFields, exercisePositions, exerciseTitle } from './exerciseView.js'
import { gameReducer, initialGame, intervalQuizText, stringOrdinal, toggleInterval } from './intervalQuiz.js'
import { clickModeAccents, metronomeSettings, metronomeStatus, tapVerdict } from './rhythmView.js'
import { drillFeedback, initialDrill, buildQuestion, keyInfo } from './theoryDrill.js'
import { TUNINGS } from './theory.js'

const tuning = TUNINGS.standard.pitches
const name = (s) => ['E', 'A', 'D', 'G', 'B', 'E'][s]

describe('rhythm view', () => {
  it('fills saved metronome settings and fits accents', () => {
    const s = metronomeSettings({ meter: '3/4', gap: { on: true } })
    expect(s.accents).toEqual(['accent', 'beat', 'beat'])
    expect(s.gap).toEqual({ on: true, play: 2, mute: 2 })
    expect(metronomeStatus({ bar: -1, beat: 1 }, s)).toBe('Count-in 2…')
  })
  it('thins the click for the timing test', () => {
    expect(clickModeAccents('backbeat', ['accent', 'beat', 'beat', 'beat'])).toEqual(['mute', 'accent', 'mute', 'accent'])
    expect(tapVerdict({ label: 'Good', grade: 'good', ms: 31 }, '')).toBe('Good · +31 ms')
  })
})

describe('exercise view', () => {
  it('lists just the controls an exercise uses, with typed values', () => {
    const score = buildExercise({ exercise: 'triadSets' }, tuning)
    const fields = exerciseFields(score, tuning, name)
    expect(fields.map((f) => f.id)).toEqual(['scale7', 'stringSet', 'inversion', 'triadStyle', 'rate', 'meter'])
    expect(fields.find((f) => f.id === 'inversion').options[1].value).toBe(1)
  })
  it('titles and positions a scale sequence', () => {
    const score = buildExercise({ exercise: 'scaleSequence', key: 'A', scale: 'minorPentatonic' }, tuning)
    expect(exerciseTitle(score)).toBe('A Minor Pentatonic: scale sequences')
    expect(exercisePositions(score, tuning)).toHaveLength(5)
    expect(exerciseColumns(score, 'notes')[0].label).toBe('A')
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

describe('chart view', () => {
  it('reads bars', () => {
    expect(barTokens('%')).toEqual([{ kind: 'repeat' }])
    expect(barTokens('C7 / NC').map((t) => t.kind)).toEqual(['chord', 'slash', 'nc'])
  })
  it('spreads a pasted line over the bars', () => {
    expect(spreadBars(['', '', '', ''], 1, '| C | Am | F G |')).toEqual(['', 'C', 'Am', 'F G'])
    expect(nextSection([{ label: 'A', bars: [] }]).label).toBe('B')
    expect(moveSection(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(transposeText(10, 'F')).toBe('Transposed down 2 half steps from F.')
  })
  it('shelves and filters the catalog', () => {
    const all = catalogCharts([], [{ id: 'local:1', title: 'Zz mine', composer: '', style: 'swing', key: 'C', time: '4/4', tempo: 100, sections: [] }], {})
    expect(chartShelves([], [{}], {}).at(-1)).toBe('My charts')
    expect(filterCharts(all, { collection: 'My charts' }).map((c) => c.title)).toEqual(['Zz mine'])
  })
})
