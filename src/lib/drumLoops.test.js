import { describe, expect, it } from 'vitest'
import { KIT_SAMPLES } from './drumKits.js'
import { pickLayer } from './drumEngine.js'
import { DRUM_VOICES, barSeconds, countLabel, hitsAt, isValidLoop, loopTracks, meterLabel, stepOffsets, swingDelay } from './drumLoops.js'
import { PRESETS, STYLES, presetById } from './drumPresets.js'

const basic = presetById('basic-rock')

describe('presets', () => {
  it('are all well formed, with unique ids and a known style', () => {
    const ids = new Set()
    for (const p of PRESETS) {
      expect(isValidLoop(p), p.id).toBe(true)
      expect(STYLES).toContain(p.style)
      expect(ids.has(p.id), p.id).toBe(false)
      ids.add(p.id)
    }
  })

  it('only use drums the rock kit has recorded', () => {
    for (const p of PRESETS) for (const voice of Object.keys(p.tracks)) expect(KIT_SAMPLES.rock[voice], `${p.id} ${voice}`).toBeDefined()
  })

  it('include every groove from the rock collection', () => {
    const names = PRESETS.filter((p) => p.style === 'Rock').map((p) => p.name)
    for (const n of ['Basic rock', 'Driving rock', 'Open hat rock', 'Sixteenth hat rock', 'Floor tom rock', 'Half-time rock', 'Ride rock', 'Shuffle rock', 'Tribal tom groove', 'Rock ballad (12/8)', 'Four-on-the-floor rock', 'Stomp-stomp-clap', 'Garage rock (open hats)'])
      expect(names).toContain(n)
  })
})

describe('loops', () => {
  it('lists tracks top to bottom as drawn: cymbals, then snare, then kick', () => {
    expect(loopTracks(basic).map((t) => t.voice)).toEqual(['hihat', 'snare', 'kick'])
  })

  it('finds the hits on a step with their velocity', () => {
    expect(hitsAt(basic, 0)).toEqual([
      { voice: 'hihat', level: 'x', velocity: 0.72 },
      { voice: 'kick', level: 'x', velocity: 0.72 },
    ])
    expect(hitsAt(basic, 4).find((h) => h.voice === 'snare')).toEqual({ voice: 'snare', level: 'X', velocity: 1 })
    expect(hitsAt(basic, 1)).toEqual([])
  })

  it('names meters and counts like a drummer', () => {
    expect(meterLabel(basic)).toBe('4/4')
    expect(meterLabel(presetById('rock-ballad-128'))).toBe('12/8')
    expect(meterLabel(presetById('jazz-waltz'))).toBe('9/8')
    expect(meterLabel(presetById('waltz'))).toBe('3/4')
    expect([0, 1, 2, 3, 4].map((s) => countLabel(basic, s))).toEqual(['1', '1 e', '1 &', '1 a', '2'])
    expect(countLabel(presetById('shuffle-rock'), 5)).toBe('2 let')
  })

  it('times steps from the tempo', () => {
    // 120 bpm 16ths: 0.125 s a step, 2 s a bar.
    expect(barSeconds(basic, 120)).toBeCloseTo(2)
    expect(stepOffsets(basic, 120)[4]).toBeCloseTo(0.5)
    // 12/8 at 66 bpm (dotted quarter): 12 triplet 8ths over 4 beats.
    expect(barSeconds(presetById('rock-ballad-128'), 66)).toBeCloseTo((60 / 66) * 4)
  })

  it('swings every second step, and never a triplet grid', () => {
    const boomBap = presetById('boom-bap')
    const step = 60 / 90 / 4
    expect(swingDelay(boomBap, 90, 0.58, 0)).toBe(0)
    expect(swingDelay(boomBap, 90, 0.58, 1)).toBeCloseTo(0.16 * step)
    expect(swingDelay(boomBap, 90, 0.5, 1)).toBe(0)
    expect(swingDelay(presetById('shuffle-rock'), 90, 0.66, 1)).toBe(0)
    // A full triplet swing puts the off-step two thirds of the way through the pair.
    expect(stepOffsets(boomBap, 90, 2 / 3)[1]).toBeCloseTo((2 / 3) * 2 * step)
  })

  it('rejects broken loops', () => {
    expect(isValidLoop({ ...basic, tracks: { kick: 'x...' } })).toBe(false)
    expect(isValidLoop({ ...basic, tracks: { cowbell: 'x'.repeat(16) } })).toBe(false)
    expect(isValidLoop({ ...basic, tracks: { kick: 'q'.repeat(16) } })).toBe(false)
    expect(isValidLoop({ ...basic, bpm: 0 })).toBe(false)
    expect(isValidLoop({ ...basic, steps: 5 })).toBe(false)
  })
})

describe('kit samples', () => {
  it('has a General MIDI note for every drum', () => {
    expect(new Set(DRUM_VOICES.map((v) => v.gm)).size).toBe(DRUM_VOICES.length)
  })

  it('records every drum soft to hard', () => {
    for (const [voice, spec] of Object.entries(KIT_SAMPLES.rock)) {
      expect(spec.layers.length, voice).toBeGreaterThanOrEqual(3)
      expect([...spec.layers].sort((a, b) => a - b), voice).toEqual(spec.layers)
      expect(spec.layers.at(-1)).toBe(1)
    }
  })

  it('plays ghost notes from a soft take, not a turned-down loud one', () => {
    const snare = KIT_SAMPLES.rock.snare.layers
    expect(pickLayer(snare, 0.3).layer).toBeLessThan(pickLayer(snare, 0.72).layer)
    expect(pickLayer(snare, 1).layer).toBe(snare.length - 1)
    expect(pickLayer([0.2, 0.5, 1], 0.5)).toEqual({ layer: 1, gain: 1 })
  })
})
