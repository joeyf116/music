import { describe, expect, it } from 'vitest'
import { STYLES } from './arranger.js'
import { ALL_KEYS, badTokens, compileChart, keyUsesFlats, parseBar, parseChord, qualityIntervals, slotBeats, transposeChart, transposeKey, transposeSymbol, validateChart } from './chart.js'
import { LIBRARY } from './chartLibrary.js'

describe('qualityIntervals', () => {
  it.each([
    ['', [0, 4, 7]],
    ['m', [0, 3, 7]],
    ['-7', [0, 3, 7, 10]],
    ['maj7', [0, 4, 7, 11]],
    ['^7', [0, 4, 7, 11]],
    ['Δ', [0, 4, 7, 11]],
    ['7', [0, 4, 7, 10]],
    ['9', [0, 4, 7, 10, 14]],
    ['13', [0, 4, 7, 10, 14, 21]],
    ['m7b5', [0, 3, 6, 10]],
    ['ø', [0, 3, 6, 10]],
    ['dim7', [0, 3, 6, 9]],
    ['o7', [0, 3, 6, 9]],
    ['dim', [0, 3, 6]],
    ['aug', [0, 4, 8]],
    ['+7', [0, 4, 8, 10]],
    ['sus4', [0, 5, 7]],
    ['7sus4', [0, 5, 7, 10]],
    ['sus2', [0, 2, 7]],
    ['6', [0, 4, 7, 9]],
    ['m6', [0, 3, 7, 9]],
    ['69', [0, 4, 7, 9, 14]],
    ['6/9', [0, 4, 7, 9, 14]],
    ['add9', [0, 4, 7, 14]],
    ['7b9', [0, 4, 7, 10, 13]],
    ['7#9', [0, 4, 7, 10, 15]],
    ['7#11', [0, 4, 7, 10, 18]],
    ['maj7#11', [0, 4, 7, 11, 18]],
    ['m(maj7)', [0, 3, 7, 11]],
    ['mMaj7', [0, 3, 7, 11]],
    ['m11', [0, 3, 7, 10, 14, 17]],
    ['5', [0, 7]],
    ['alt', [0, 4, 10, 13, 15, 20]],
    ['7alt', [0, 4, 10, 13, 15, 20]],
  ])('reads "%s"', (q, intervals) => expect(qualityIntervals(q)).toEqual(intervals))

  it('rejects nonsense', () => {
    expect(qualityIntervals('xyz')).toBeNull()
    expect(qualityIntervals('7q')).toBeNull()
  })
})

describe('parseChord', () => {
  it('reads roots, accidentals and slash basses', () => {
    expect(parseChord('Bb7')).toMatchObject({ root: 10, intervals: [0, 4, 7, 10], bass: null })
    expect(parseChord('F#m7b5')).toMatchObject({ root: 6, intervals: [0, 3, 6, 10] })
    expect(parseChord('C/E')).toMatchObject({ root: 0, bass: 4 })
    expect(parseChord('Ab♭')).toBeNull()
    expect(parseChord('H7')).toBeNull()
    expect(parseChord('')).toBeNull()
  })
})

describe('bars', () => {
  it('splits slots, holds and rests', () => {
    expect(parseBar('Dm7 G7').slots.map((s) => s.symbol)).toEqual(['Dm7', 'G7'])
    expect(parseBar('C / / G7').slots[1]).toEqual({ hold: true })
    expect(parseBar('NC').slots[0]).toEqual({ rest: true })
    expect(parseBar('%').repeat).toBe(true)
    expect(parseBar('Cmaj7 Zz')).toBeNull()
    expect(badTokens('Cmaj7 Zz / %')).toEqual(['Zz'])
  })

  it('shares beats out evenly', () => {
    expect(slotBeats(1, 4)).toEqual([4])
    expect(slotBeats(2, 4)).toEqual([2, 2])
    expect(slotBeats(3, 4)).toEqual([2, 1, 1])
    expect(slotBeats(2, 3)).toEqual([2, 1])
    expect(slotBeats(8, 4)).toEqual([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
  })
})

describe('compileChart', () => {
  const chart = { key: 'C', time: '4/4', sections: [{ label: 'A', bars: ['C', 'Dm7 G7', '%', '', 'C / / A7', 'NC'] }] }
  const song = compileChart(chart)
  const symbols = (bar) => bar.events.map((e) => [e.beat, e.beats, e.chord && e.chord.root])

  it('turns bars into timed chord events', () => {
    expect(song.beats).toBe(4)
    expect(song.bars).toHaveLength(6)
    expect(symbols(song.bars[0])).toEqual([[0, 4, 0]])
    expect(symbols(song.bars[1])).toEqual([[0, 2, 2], [2, 2, 7]])
  })

  it('repeats, holds and rests', () => {
    expect(symbols(song.bars[2])).toEqual([[0, 2, 2], [2, 2, 7]])
    expect(symbols(song.bars[3])).toEqual([[0, 4, 7]])
    expect(symbols(song.bars[4])).toEqual([[0, 3, 0], [3, 1, 9]])
    expect(symbols(song.bars[5])).toEqual([[0, 4, null]])
  })
})

describe('transposing', () => {
  it('moves keys and chord symbols', () => {
    expect(transposeKey('C', 3)).toBe('Eb')
    expect(transposeKey('Am', 2)).toBe('Bm')
    expect(transposeSymbol('Dm7/G', 2, false)).toBe('Em7/A')
    expect(transposeSymbol('G7b9', 3, true)).toBe('Bb7b9')
    expect(keyUsesFlats('Dm')).toBe(true)
    expect(keyUsesFlats('Em')).toBe(false)
  })

  it('names keys the usual way and keeps both names of enharmonic keys', () => {
    expect(transposeKey('C', 1)).toBe('Db')
    expect(transposeKey('Am', 11)).toBe('G#m')
    expect(keyUsesFlats('Bbm')).toBe(true)
    expect(keyUsesFlats('Ebm')).toBe(true)
    expect(keyUsesFlats('C#')).toBe(false)
    expect(ALL_KEYS).toEqual(expect.arrayContaining(['Db', 'C#', 'Gb', 'F#', 'G#m', 'Abm', 'D#m', 'Ebm']))
  })

  it('keeps passing chords on their letter when transposing', () => {
    const moved = transposeChart({ key: 'Bb', sections: [{ label: 'A', bars: ['Bbmaj7 C#dim7', 'Cm7 F7'] }] }, 'F')
    expect(moved.sections[0].bars).toEqual(['Fmaj7 G#dim7', 'Gm7 C7'])
    // E#/B#/Fb/Cb read badly on a chart, so they fall back to the key's accidentals.
    expect(transposeChart({ key: 'C', sections: [{ label: 'A', bars: ['C Ab'] }] }, 'Eb').sections[0].bars).toEqual(['Eb B'])
  })

  it('reads lowercase maj as a major triad', () => {
    expect(qualityIntervals('maj')).toEqual([0, 4, 7])
    expect(qualityIntervals('mM7')).toEqual([0, 3, 7, 11])
  })

  it('transposes a whole chart', () => {
    const moved = transposeChart({ key: 'C', sections: [{ label: 'A', bars: ['Dm7 G7', '%', 'C / / A7'] }] }, 'F')
    expect(moved.key).toBe('F')
    expect(moved.sections[0].bars).toEqual(['Gm7 C7', '%', 'F / / D7'])
  })
})

describe('validateChart', () => {
  const base = { title: ' My  tune ', composer: '', style: 'bossa', key: 'D', time: '4/4', tempo: 500, sections: [{ label: 'A', bars: ['Dmaj7', ' Em7  A7 '] }] }

  it('tidies a good chart', () => {
    const { chart } = validateChart(base, STYLES)
    expect(chart.title).toBe('My tune')
    expect(chart.tempo).toBe(300)
    expect(chart.sections[0].bars).toEqual(['Dmaj7', 'Em7 A7'])
  })

  it('points at problems', () => {
    expect(validateChart({ ...base, title: '' }, STYLES).error).toMatch(/title/)
    expect(validateChart({ ...base, sections: [{ label: 'A', bars: ['Dmaj7', 'Qq'] }] }, STYLES).error).toMatch(/Bar 2 of A.*Qq/)
    expect(validateChart({ ...base, sections: [] }, STYLES).error).toMatch(/at least one bar/)
  })

  it('accepts every chart in the library', () => {
    for (const chart of LIBRARY) expect(validateChart(chart, STYLES).error, chart.title).toBeUndefined()
  })
})

describe('seeded popular charts', async () => {
  const { POPULAR_CHARTS } = await import('../../supabase/seed/popular-charts.js')

  it('are 50 distinct, playable charts', () => {
    expect(POPULAR_CHARTS).toHaveLength(50)
    expect(new Set(POPULAR_CHARTS.map((c) => c.title.toLowerCase())).size).toBe(50)
    for (const draft of POPULAR_CHARTS) {
      const { chart, error } = validateChart(draft, STYLES)
      expect(error, draft.title).toBeUndefined()
      expect([chart.key, chart.style, chart.time], draft.title).toEqual([draft.key, draft.style, draft.time])
      expect(draft.collection.length, draft.title).toBeLessThanOrEqual(30)
    }
  })

  it("don't repeat a built-in chart's title", () => {
    const builtIn = new Set(LIBRARY.map((c) => c.title.toLowerCase()))
    for (const c of POPULAR_CHARTS) expect(builtIn.has(c.title.toLowerCase()), c.title).toBe(false)
  })
})
