import { describe, expect, it } from 'vitest'
import { bassNotes, compHits, drumHits, STYLE_IDS, STYLES, swingTime, voiceChord } from './arranger.js'
import { compileChart, parseChord } from './chart.js'
import { mod12 } from './theory.js'

const steady = () => 0.4

describe('drumHits', () => {
  it('reads the rock pattern', () => {
    const hits = drumHits('rock', 4)
    expect(hits.filter((h) => h.voice === 'snare').map((h) => h.time)).toEqual([1, 3])
    expect(hits.filter((h) => h.voice === 'hat')).toHaveLength(8)
  })

  it('alternates two-bar patterns', () => {
    const rim = (bar) => drumHits('bossa', 4, bar).filter((h) => h.voice === 'rim').map((h) => h.time)
    expect(rim(0)).not.toEqual(rim(1))
    expect(rim(0)).toEqual(rim(2))
  })

  it('plays a fill into a new section and a crash at the top of one', () => {
    const plain = drumHits('rock', 4, 0)
    const fill = drumHits('rock', 4, 0, { fill: true })
    expect(plain.some((h) => h.voice.startsWith('tom'))).toBe(false)
    expect(fill.filter((h) => h.voice.startsWith('tom')).every((h) => h.time >= 2)).toBe(true)
    expect(fill.some((h) => h.voice === 'hat' && h.time >= 2)).toBe(false)
    const crash = drumHits('rock', 4, 0, { crash: true })
    expect(crash.filter((h) => h.time === 0).map((h) => h.voice).sort()).toEqual(['crash', 'kick'])
    expect(drumHits('bossa', 4, 0, { crash: true }).some((h) => h.voice === 'crash')).toBe(false)
  })

  it('adds the odd soft snare comp in swing, but not always the same', () => {
    const ghosts = (r) => drumHits('swing', 4, 0, {}, () => r).filter((h) => h.voice === 'ghost')
    expect(ghosts(0.05).length).toBeGreaterThan(0)
    expect(ghosts(0.9)).toEqual([])
  })

  it('fits any meter', () => {
    for (const style of STYLE_IDS)
      for (const beats of [2, 3, 4, 5, 6]) {
        const hits = drumHits(style, beats)
        expect(hits.length, `${style} ${beats}`).toBeGreaterThan(0)
        expect(Math.max(...hits.map((h) => h.time))).toBeLessThan(beats)
      }
  })
})

describe('swingTime', () => {
  it('delays offbeat eighths only when swinging', () => {
    expect(swingTime(1.5, true)).toBeCloseTo(1 + 2 / 3)
    expect(swingTime(1.5, false)).toBe(1.5)
    expect(swingTime(2, true)).toBe(2)
  })
})

describe('bassNotes', () => {
  const song = compileChart({ time: '4/4', sections: [{ label: 'A', bars: ['Dm7 G7', 'Cmaj7'] }] })
  const [first, second] = song.bars

  it('walks quarter notes, starting each chord on its root and leading into the next', () => {
    const notes = bassNotes('swing', first.events, 4, second.events[0].chord, {}, steady)
    expect(notes.map((n) => n.time)).toEqual([0, 1, 2, 3])
    expect(mod12(notes[0].pitch)).toBe(2)
    expect(mod12(notes[2].pitch)).toBe(7)
    expect([1, 11]).toContain(mod12(notes[3].pitch)) // half step from C
    for (const n of notes) expect(n.pitch).toBeGreaterThanOrEqual(26)
  })

  it('plays the slash bass note', () => {
    const [bar] = compileChart({ time: '4/4', sections: [{ label: 'A', bars: ['C/E'] }] }).bars
    for (const style of STYLE_IDS) expect(mod12(bassNotes(style, bar.events, 4, null, {}, steady)[0].pitch), style).toBe(4)
  })

  it('gives every chord a note on its first beat in every style', () => {
    for (const style of STYLE_IDS) {
      const notes = bassNotes(style, first.events, 4, null, {}, steady)
      expect(notes.some((n) => n.time === 0 && mod12(n.pitch) === 2), style).toBe(true)
      expect(notes.some((n) => n.time === 2 && mod12(n.pitch) === 7), style).toBe(true)
    }
  })

  it('stays quiet on a rest', () => {
    const [bar] = compileChart({ time: '4/4', sections: [{ label: 'A', bars: ['NC'] }] }).bars
    expect(bassNotes('rock', bar.events, 4, null)).toEqual([])
  })
})

describe('compHits', () => {
  it('can push the next chord onto the last offbeat, then lets it ring', () => {
    const song = compileChart({ time: '4/4', sections: [{ label: 'A', bars: ['Dm7', 'G7'] }] })
    const state = {}
    const first = compHits('swing', song.bars[0].events, 4, 0, () => 0.01, song.bars[1].events[0].chord, state)
    expect(first.at(-1)).toMatchObject({ time: 3.5, chord: { root: 7 } })
    expect(state.pushed).toBe(true)
    const second = compHits('swing', song.bars[1].events, 4, 1, () => 0.01, null, state)
    expect(second.every((h) => h.time >= 1)).toBe(true)
  })

  it('hits every chord at least once', () => {
    const [bar] = compileChart({ time: '4/4', sections: [{ label: 'A', bars: ['C F G7 C'] }] }).bars
    for (const style of STYLE_IDS) {
      const hits = compHits(style, bar.events, 4, 0, steady)
      for (const root of [0, 5, 7]) expect(hits.some((h) => h.chord.root === root), `${style} ${root}`).toBe(true)
      for (const h of hits) expect(h.time + h.length).toBeLessThanOrEqual(4)
    }
  })
})

describe('voiceChord', () => {
  it('voices the guide tones close together in the middle register', () => {
    const v = voiceChord(parseChord('G7'))
    expect(v.map(mod12).sort((a, b) => a - b)).toEqual([2, 5, 11]) // B, D, F: 3rd, 5th, 7th
    expect(Math.max(...v) - Math.min(...v)).toBeLessThan(12)
  })

  it('moves smoothly from the last voicing', () => {
    const dm = voiceChord(parseChord('Dm7'))
    const g = voiceChord(parseChord('G7'), dm)
    const centre = (v) => v.reduce((a, b) => a + b, 0) / v.length
    expect(Math.abs(centre(g) - centre(dm))).toBeLessThan(4)
  })

  it('gives jazz styles rootless voicings with 9ths and 13ths', () => {
    const g7 = voiceChord(parseChord('G7'), null, 'rootless').map(mod12).sort((a, b) => a - b)
    expect(g7).toEqual([4, 5, 9, 11]) // E (13), F (b7), A (9), B (3)
    const cmaj = voiceChord(parseChord('Cmaj7'), null, 'rootless').map(mod12).sort((a, b) => a - b)
    expect(cmaj).toEqual([2, 4, 7, 11]) // 9, 3, 5, 7
    expect(voiceChord(parseChord('G7b9'), null, 'rootless').map(mod12)).toContain(8) // alterations kept
  })

  it('puts the root under a full chord for pop and rock', () => {
    const [left, ...right] = voiceChord(parseChord('Am'), null, 'spread')
    expect(mod12(left)).toBe(9)
    expect(right.map(mod12).sort((a, b) => a - b)).toEqual([0, 4, 9])
    expect(Math.min(...right)).toBeGreaterThan(left)
  })

  it('keeps triads whole', () => {
    expect(voiceChord(parseChord('C')).map(mod12).sort((a, b) => a - b)).toEqual([0, 4, 7])
  })

  it('covers every style', () => expect(STYLE_IDS.every((id) => STYLES[id].name)).toBe(true))
})
