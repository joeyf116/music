import { describe, expect, it } from 'vitest'
import { CLICK_SOUNDS, SOUND_FAMILIES } from './clickSounds.js'
import {
  RHYTHMS,
  RHYTHM_LEVELS,
  barAudible,
  barPulses,
  defaultAccents,
  fitAccents,
  gapStatus,
  judgeTap,
  nextAccent,
  parseBeats,
  regridBeat,
  rhythmCells,
  rhythmScore,
  summarizeTaps,
  tapTempo,
  tempoAtBar,
  tempoName,
  toggleCell,
} from './rhythm.js'

const STANDARD = [40, 45, 50, 55, 59, 64]

describe('metronome', () => {
  it('accents beat 1, and each group start in 8th-note meters', () => {
    expect(defaultAccents('4/4')).toEqual(['accent', 'beat', 'beat', 'beat'])
    expect(defaultAccents('6/8')).toEqual(['accent', 'beat', 'beat', 'accent', 'beat', 'beat'])
    expect(defaultAccents('7/8').filter((a) => a === 'accent')).toHaveLength(3)
  })

  it('keeps saved accents only when they fit the meter', () => {
    expect(fitAccents(['mute', 'accent', 'beat'], '3/4')).toEqual(['mute', 'accent', 'beat'])
    expect(fitAccents(['mute', 'accent', 'beat'], '4/4')).toEqual(defaultAccents('4/4'))
    expect(nextAccent('accent')).toBe('beat')
    expect(nextAccent('mute')).toBe('accent')
  })

  it('splits each beat into its subdivision, with quieter in-between clicks', () => {
    const pulses = barPulses(['accent', 'beat'], 'triplets')
    expect(pulses.map((p) => p.level)).toEqual(['accent', 'sub', 'sub', 'beat', 'sub', 'sub'])
    expect(pulses[4].at).toBeCloseTo(1 + 1 / 3)
    expect(barPulses(['accent', 'beat'], 'swing').map((p) => p.at)).toEqual([0, 2 / 3, 1, 1 + 2 / 3])
    // A muted beat keeps its subdivisions, for hearing only the off-beats.
    expect(barPulses(['mute'], 'eighths').map((p) => p.level)).toEqual(['mute', 'sub'])
  })

  it('drops the click out for the gap bars', () => {
    const gap = { on: true, play: 2, mute: 1 }
    expect([0, 1, 2, 3, 4, 5].map((b) => barAudible(b, gap))).toEqual([true, true, false, true, true, false])
    expect(barAudible(2, { ...gap, on: false })).toBe(true)
    expect(gapStatus(2, gap)).toMatch(/Silent/)
  })

  it('raises the tempo every few bars up to the limit', () => {
    const speed = { on: true, step: 5, every: 2, max: 110 }
    expect([0, 1, 2, 3, 4, 10].map((b) => tempoAtBar(b, 100, speed))).toEqual([100, 100, 105, 105, 110, 110])
    expect(tempoAtBar(10, 100, { ...speed, on: false })).toBe(100)
  })

  it('works out a tempo from taps and starts over after a pause', () => {
    expect(tapTempo([1])).toBe(null)
    expect(tapTempo([0, 0.5, 1, 1.5])).toBe(120)
    expect(tapTempo([0, 0.5, 5, 5.6])).toBe(100)
    expect(tempoName(120)).toBe('Allegro')
  })

  it('has natural and digital sounds with unique ids', () => {
    expect(SOUND_FAMILIES).toEqual(['Natural', 'Digital'])
    expect(new Set(CLICK_SOUNDS.map((s) => s.id)).size).toBe(CLICK_SOUNDS.length)
    for (const family of SOUND_FAMILIES) expect(CLICK_SOUNDS.filter((s) => s.family === family).length).toBeGreaterThanOrEqual(4)
  })
})

describe('timing feedback', () => {
  it('grades a tap against the nearest beat', () => {
    expect(judgeTap(1.01, [0.5, 1, 1.5])).toMatchObject({ target: 1, ms: 10, grade: 'perfect' })
    expect(judgeTap(0.96, [0.5, 1, 1.5])).toMatchObject({ ms: -40, grade: 'good' })
    expect(judgeTap(1.08, [0.5, 1, 1.5])).toMatchObject({ grade: 'off', label: 'Late' })
    expect(judgeTap(3, [0.5, 1])).toBe(null)
  })

  it('sums up rushing, dragging and steadiness', () => {
    expect(summarizeTaps([])).toBe(null)
    const rushing = summarizeTaps([-30, -20, -25, -25])
    expect(rushing).toMatchObject({ mean: -25, tight: 3 })
    expect(rushing.verdict).toMatch(/Rushing: 25 ms ahead/)
    expect(summarizeTaps([2, -3, 4, -1]).verdict).toMatch(/Right on the beat.*very steady/)
    expect(summarizeTaps([40, 30, 50]).verdict).toMatch(/Dragging/)
  })
})

describe('rhythm patterns', () => {
  it('every pattern parses to whole beats and every level has some', () => {
    for (const r of RHYTHMS) {
      const beats = parseBeats(r.beats)
      expect(beats.join(' '), r.id).toBe(r.beats)
      expect([3, 4], r.id).toContain(beats.length)
    }
    for (const level of RHYTHM_LEVELS) expect(RHYTHMS.filter((r) => r.level === level.id).length).toBeGreaterThanOrEqual(4)
  })

  it('places cells on the 12-tick beat grid with counts and strum directions', () => {
    const cells = rhythmCells('x. xxxx xxx')
    expect(cells.map((c) => c.tick)).toEqual([0, 6, 12, 15, 18, 21, 24, 28, 32])
    expect(cells.map((c) => c.count)).toEqual(['1', '&', '2', 'e', '&', 'a', '3', 'trip', 'let'])
    // Down on the beat and the "&", up in between; triplets alternate.
    expect(cells.filter((c) => c.hit).map((c) => c.strum)).toEqual(['down', 'down', 'up', 'down', 'up', 'down', 'up', 'down'])
  })

  it('edits a pattern one box at a time', () => {
    expect(toggleCell('x. x.', 1, 1)).toBe('x. xx')
    expect(regridBeat('x. xx', 1, 4)).toBe('x. x...')
    expect(regridBeat('x. .x', 1, 3)).toBe('x. ...')
  })

  it('builds a looping score with rests, strum arrows and muted strings', () => {
    const score = rhythmScore('x. .x x. xx', { bars: 2, tuning: STANDARD })
    expect(score.bars).toBe(2)
    expect(score.events).toHaveLength(16)
    expect(score.events.filter((e) => e.notes.length)).toHaveLength(10)
    expect(score.events[3]).toMatchObject({ label: '↑', strum: 'up', count: '&', muted: true })
    expect(score.events[3].notes.every((n) => n.fret === 'x')).toBe(true)
    expect(score.events[8].barStart).toBe(true)
  })

  it('can sound a chord in the key or the root note instead', () => {
    const chord = rhythmScore('x.', { bars: 1, tuning: STANDARD, playOn: 'chord', rootPc: 4, minor: true })
    expect(chord.events[0].notes.map((n) => n.fret)).toEqual([0, 2, 2, 0, 0, 0])
    const note = rhythmScore('x.', { bars: 1, tuning: STANDARD, playOn: 'note', rootPc: 9 })
    expect(note.events[0].notes).toEqual([{ string: 0, fret: 5, pitch: 45 }])
  })
})
