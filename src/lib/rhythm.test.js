import { describe, expect, it } from 'vitest'
import { CLICK_SOUNDS, SOUND_FAMILIES } from './clickSounds.js'
import {
  barAudible,
  barPulses,
  defaultAccents,
  fitAccents,
  gapStatus,
  nextAccent,
  tapTempo,
  tempoAtBar,
  tempoName,
} from './rhythm.js'

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
