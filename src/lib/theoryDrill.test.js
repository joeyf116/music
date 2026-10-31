import { describe, expect, it } from 'vitest'
import {
  DRILLS,
  buildHint,
  buildQuestion,
  chordFormula,
  choiceHint,
  chordTones,
  drillChordPitches,
  drillReducer,
  drillState,
  initialDrill,
  keyInfo,
  keyPatternRule,
  nameQuestion,
  pickedIn,
  randomDrillQuestion,
  randomKey,
  spellQuestion,
  stackedThirds,
} from './theoryDrill.js'

const sequence = (...values) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('keys and chords', () => {
  it('spells the scale and the chord pattern of a key', () => {
    const c = keyInfo('C', 'major')
    expect(c.scale).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(c.chords.map((ch) => ch.name)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'])
    expect(keyPatternRule(c)).toContain('I ii iii IV V vi vii°')
    const a = keyInfo('A', 'minor', true)
    expect(a.chords.map((ch) => ch.name)).toEqual(['Am7', 'Bm7♭5', 'Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7'])
    expect(keyPatternRule(a)).toContain('6th note')
  })

  it('finds the parent major key of a mode', () => {
    const d = keyInfo('E', 'dorian')
    expect(d.scale).toEqual(['E', 'F#', 'G', 'A', 'B', 'C#', 'D'])
    expect(d.parent).toBe('D')
    expect(keyPatternRule(d)).toBe('E Dorian uses the chords of D major, started on its 2nd note: i ii ♭III IV v vi° ♭VII.')
  })

  it('stacks every other scale note', () => {
    expect(chordTones(5)).toEqual([5, 0, 2])
    expect(chordTones(6, true)).toEqual([6, 1, 3, 5])
  })

  it('explains a chord as a formula and stacked 3rds', () => {
    expect(chordFormula('min7')).toEqual(['1', '♭3', '5', '♭7'])
    expect(chordFormula('dim7')).toEqual(['1', '♭3', '♭5', '♭♭7'])
    expect(stackedThirds(['B', 'D', 'F'], 'dim').map((t) => t.label)).toEqual(['minor 3rd', 'minor 3rd'])
    expect(stackedThirds(['C', 'E', 'G', 'B'], 'maj7').map((t) => t.semitones)).toEqual([4, 3, 4])
  })

  it('picks keys from the chosen set, or stays in my key', () => {
    expect(randomKey({ keys: 'minor' }, sequence(0, 0.7))).toEqual({ root: 'G#', scaleId: 'minor' })
    expect(randomKey({ keys: 'both', keyMode: 'fixed', keyName: 'Eb' }, sequence(0.9))).toEqual({ root: 'Eb', scaleId: 'minor' })
    // Dorian (2nd mode) of Eb major is F Dorian.
    const mode = randomKey({ keys: 'modes' }, sequence(1 / 7 + 0.01, 3 / 11 + 0.01))
    expect(mode).toEqual({ root: 'F', scaleId: 'dorian' })
  })
})

describe('questions', () => {
  it('builds a chord from the scale, then asks its quality', () => {
    const q = buildQuestion(keyInfo('D', 'major'), 6)
    expect(q.prompt).toBe('Build the 7th chord in D major')
    expect(q.steps[0].options.map((o) => o.label)).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'])
    expect(q.steps[0].answers).toEqual([6, 1, 3])
    expect(q.steps[1].answers).toEqual(['dim'])
    expect(q.steps[1].prompt).toBe('C# E G: is it major, minor or diminished?')
    expect(q.chord.name).toBe('C#dim')
  })

  it('names chords both ways', () => {
    const info = keyInfo('G', 'major')
    const forward = nameQuestion(info, 5, sequence(0.1))
    expect(forward.prompt).toBe('What’s the 6th chord in G major?')
    expect(forward.steps[0].answers).toEqual(['Em'])
    expect(forward.steps[0].options.map((o) => o.id)).toContain('Em')
    expect(new Set(forward.steps[0].options.map((o) => o.id)).size).toBe(forward.steps[0].options.length)
    const back = nameQuestion(info, 1, sequence(0.9))
    expect(back.prompt).toBe('In G major, which chord number is Am?')
    expect(back.steps[0].answers).toEqual(['ii'])
    expect(back.steps[0].options).toHaveLength(7)
  })

  it('spells chords without double sharps or flats', () => {
    for (let seed = 0; seed < 200; seed++) {
      let s = seed + 1
      const random = () => ((s = (s * 16807) % 2147483647) / 2147483647)
      const q = spellQuestion(seed % 2 === 0, random)
      const step = q.steps[0]
      expect(step.options.map((o) => o.id)).toContain(step.answers[0])
      for (const o of step.options) expect(o.label).not.toMatch(/##|bb/)
      expect(q.chord.notes.join(' ')).not.toMatch(/##|bb/)
    }
  })

  it('does not ask the same question twice in a row', () => {
    const settings = { drill: 'build', keys: 'major', keyMode: 'fixed', keyName: 'C' }
    const first = randomDrillQuestion(settings, { random: sequence(0, 0) })
    const second = randomDrillQuestion(settings, { previous: first, random: sequence(0, 0, 0, 0.5) })
    expect(second.prompt).not.toBe(first.prompt)
    expect(DRILLS.map((d) => d.value)).toEqual(['build', 'name', 'spell', 'mix'])
  })

  it('hints at the method after a wrong tap', () => {
    const q = buildQuestion(keyInfo('C', 'major'), 3)
    expect(buildHint(q, 0)).toBe('Count up C major (C D E F G A B): the 4th note is the root.')
    expect(buildHint(q, 1)).toBe('Skip one note each time: from F, jump over G to find the 3rd.')
  })

  it('hints at the rule after a wrong pick', () => {
    const info = keyInfo('G', 'major')
    expect(choiceHint(nameQuestion(info, 1, sequence(0.9)))).toBe('Count up G major (G A B C D E F#) until you reach A.')
    expect(choiceHint(nameQuestion(info, 5, sequence(0.1)))).toContain('to the 6th note, then stack every other note')
    const spell = { ...spellQuestion(true), prompt: 'Spell Dm7', chord: { type: 'min7', rootName: 'D' } }
    expect(choiceHint(spell)).toBe('Minor 7th = 1 ♭3 5 ♭7 (minor triad + ♭7). Count up from D, one letter for each 3rd.')
  })

  it('voices drill chords in one register', () => {
    expect(drillChordPitches(keyInfo('C', 'major').chords[1])).toEqual([50, 53, 57])
  })
})

describe('drill lifecycle', () => {
  const q = buildQuestion(keyInfo('C', 'major'), 1) // D F A, minor

  it('scores a clean build', () => {
    let g = initialDrill(q)
    for (const id of [1, 3, 5]) g = drillReducer(g, { type: 'guess', id })
    expect(g.step).toBe(1)
    expect(pickedIn(g, 0)).toEqual([1, 3, 5])
    g = drillReducer(g, { type: 'guess', id: 'min' })
    expect(drillState(g)).toBe('solved')
    expect(g.score).toEqual({ right: 1, tries: 1 })
  })

  it('marks wrong taps, ignores repeats and counts a missed question as a try only', () => {
    let g = initialDrill(q)
    g = drillReducer(g, { type: 'guess', id: 1 })
    g = drillReducer(g, { type: 'guess', id: 1 })
    expect(g.progress).toBe(1)
    g = drillReducer(g, { type: 'guess', id: 2 })
    expect(g.wrong).toEqual([2])
    expect(g.missed).toBe(true)
    g = drillReducer(g, { type: 'guess', id: 3 })
    expect(g.wrong).toEqual([])
    g = drillReducer(g, { type: 'guess', id: 5 })
    g = drillReducer(g, { type: 'guess', id: 'min' })
    expect(g.score).toEqual({ right: 0, tries: 1 })
    expect(drillReducer(g, { type: 'guess', id: 'maj' })).toBe(g)
  })

  it('reveals once and moves on', () => {
    let g = drillReducer(initialDrill(q), { type: 'reveal' })
    expect(drillState(g)).toBe('revealed')
    expect(pickedIn(g, 1)).toEqual(['min'])
    expect(drillReducer(g, { type: 'reveal' })).toBe(g)
    g = drillReducer(g, { type: 'next', question: q })
    expect(drillState(g)).toBe('asking')
    expect(g.score).toEqual({ right: 0, tries: 1 })
  })
})
