import { describe, expect, it } from 'vitest'
import { humanizeHit } from './drumEngine.js'
import { addVoice, clearSteps, historyReducer, pressMode, removeVoice, sameLoop, setGrid, setMix, setStep, startHistory } from './drumEdit.js'
import { audible, countLabel, hitsAt, isValidLoop, stepCount } from './drumLoops.js'
import { presetById } from './drumPresets.js'

const basic = presetById('basic-rock')

describe('editing steps', () => {
  it('paints and clears one step without touching the original', () => {
    const next = setStep(basic, 'snare', 0, 'g')
    expect(next.tracks.snare).toBe('g...X.......X...')
    expect(basic.tracks.snare).toBe('....X.......X...')
    expect(setStep(next, 'snare', 0, '.').tracks.snare).toBe(basic.tracks.snare)
    expect(setStep(basic, 'snare', 4, 'X')).toBe(basic)
    expect(setStep(basic, 'cowbell', 0, 'x')).toBe(basic)
  })

  it('paints an empty step and clears a painted one', () => {
    expect(pressMode(basic, 'snare', 0, 'X')).toBe('X')
    expect(pressMode(basic, 'snare', 4, 'x')).toBe('.')
  })

  it('adds and removes drums, never the last one', () => {
    const withRide = addVoice(basic, 'ride')
    expect(withRide.tracks.ride).toBe('.'.repeat(16))
    expect(addVoice(withRide, 'ride')).toBe(withRide)
    expect(removeVoice(withRide, 'ride').tracks).toEqual(basic.tracks)
    const lone = { ...basic, tracks: { kick: basic.tracks.kick } }
    expect(removeVoice(lone, 'kick')).toBe(lone)
  })

  it('clears every step but keeps the drums', () => {
    const empty = clearSteps(basic)
    expect(Object.keys(empty.tracks)).toEqual(Object.keys(basic.tracks))
    expect(Object.values(empty.tracks).every((t) => t === '.'.repeat(16))).toBe(true)
  })
})

describe('mix', () => {
  it('mutes, solos and turns drums down', () => {
    const muted = setMix(basic, 'hihat', { mute: true })
    expect(audible(muted, 'hihat')).toBe(false)
    expect(hitsAt(muted, 0).map((h) => h.voice)).toEqual(['kick'])
    const solo = setMix(basic, 'snare', { solo: true })
    expect(['hihat', 'snare', 'kick'].map((v) => audible(solo, v))).toEqual([false, true, false])
    const quiet = setMix(basic, 'kick', { volume: 0.5 })
    expect(hitsAt(quiet, 0).find((h) => h.voice === 'kick').volume).toBe(0.5)
  })

  it('drops settings that are back at their defaults', () => {
    expect(setMix(setMix(basic, 'kick', { mute: true }), 'kick', { mute: false }).mix).toEqual({})
  })
})

describe('grid changes', () => {
  it('repeats the groove into new bars and trims it back', () => {
    const two = setGrid(basic, { bars: 2 })
    expect(stepCount(two)).toBe(32)
    expect(two.tracks.kick).toBe(basic.tracks.kick.repeat(2))
    expect(isValidLoop(two)).toBe(true)
    expect(countLabel(two, 20)).toBe('bar 2, 2')
    const back = setGrid(two, { bars: 1 })
    expect(back.tracks).toEqual(basic.tracks)
    expect(back.bars).toBeUndefined()
  })

  it('moves hits to the nearest step when the grid changes', () => {
    // 16ths -> 8ths: the 1, & of 3 and the backbeat stay on the beat.
    const eighths = setGrid(basic, { steps: 2 })
    expect(eighths.tracks.kick).toBe('x...xx..')
    expect(eighths.tracks.snare).toBe('..X...X.')
    // 4/4 -> 3/4 drops the fourth beat.
    expect(setGrid(basic, { beats: 3 }).tracks.snare).toBe('....X.......')
  })

  it('keeps the stronger hit when two land on one step', () => {
    const loop = { ...basic, tracks: { snare: '.gX.............' } }
    expect(setGrid(loop, { steps: 2 }).tracks.snare).toBe('.X......')
  })

  it('tells an edited groove from the original', () => {
    expect(sameLoop(basic, { ...basic })).toBe(true)
    expect(sameLoop(basic, setStep(basic, 'kick', 1, 'x'))).toBe(false)
    expect(sameLoop(basic, setMix(basic, 'kick', { mute: true }))).toBe(true)
  })
})

describe('undo and redo', () => {
  it('undoes and redoes edits, and a drag counts as one edit', () => {
    let h = startHistory(basic)
    const a = setStep(basic, 'kick', 1, 'x')
    h = historyReducer(h, { type: 'set', loop: a })
    const b = setStep(a, 'kick', 2, 'x')
    h = historyReducer(h, { type: 'continue', loop: b })
    expect(h.present).toBe(b)
    h = historyReducer(h, { type: 'undo' })
    expect(h.present).toBe(basic)
    h = historyReducer(h, { type: 'redo' })
    expect(h.present).toBe(b)
    expect(historyReducer(h, { type: 'redo' })).toBe(h)
  })

  it('drops the redo trail after a new edit', () => {
    let h = historyReducer(startHistory(basic), { type: 'set', loop: clearSteps(basic) })
    h = historyReducer(h, { type: 'undo' })
    h = historyReducer(h, { type: 'set', loop: setStep(basic, 'kick', 3, 'g') })
    expect(h.future).toEqual([])
    expect(h.past).toEqual([basic])
  })
})

describe('humanize', () => {
  it('is exact when off, and only ever a little late and a little louder or softer', () => {
    expect(humanizeHit(0)).toEqual({ time: 0, velocity: 1 })
    expect(humanizeHit(1, () => 1)).toEqual({ time: 0.01, velocity: 1.12 })
    expect(humanizeHit(1, () => 0)).toEqual({ time: 0, velocity: 0.88 })
  })
})

describe('grid layout and meters', () => {
  it('draws a bar per block, and half bars on a phone so steps stay thumb-sized', async () => {
    const { gridSegments } = await import('./drumLoops.js')
    expect(gridSegments(basic, false)).toEqual([{ bar: 0, firstBeat: 0, start: 0, beats: 4 }])
    expect(gridSegments(basic, true).map((s) => [s.start, s.beats])).toEqual([[0, 2], [8, 2]])
    expect(gridSegments(setGrid(basic, { bars: 2 }), false).map((s) => s.start)).toEqual([0, 16])
    // A 9-step bar (9/8) fits a phone in one piece.
    expect(gridSegments(presetById('jazz-waltz'), true)).toHaveLength(1)
  })

  it('offers only time signatures a loop can be written in', async () => {
    const { METERS } = await import('./drumEdit.js')
    for (const m of METERS) expect(isValidLoop(setGrid(basic, m)), m.id).toBe(true)
  })
})
