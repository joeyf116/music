import { describe, expect, it } from 'vitest'
import { compileChart, parseChord } from './chart.js'
import { LIBRARY } from './chartLibrary.js'
import { TUNINGS, mod12 } from './theory.js'
import { barSymbols, chartChords, fretText, voicingsFor } from './voicings.js'

const STANDARD = TUNINGS.standard.pitches
const shapes = (symbol, tuning = STANDARD) => voicingsFor(parseChord(symbol), tuning).map((v) => fretText(v.frets).replaceAll(' ', ''))

describe('chord voicings', () => {
  it('finds the open shapes first', () => {
    expect(shapes('C')[0]).toBe('x32010')
    expect(shapes('Am')[0]).toBe('x02210')
    expect(shapes('G7')[0]).toBe('323003')
    expect(shapes('C')).toHaveLength(4)
  })

  it('puts the slash note in the bass', () => {
    for (const v of voicingsFor(parseChord('D/F#'), STANDARD)) {
      const lowest = v.notes[0]
      expect(mod12(lowest.pitch)).toBe(6)
      expect(lowest.role).toBe('bass')
    }
  })

  it('simplifies chords too big to hold, and marks them', () => {
    const v = voicingsFor(parseChord('G7alt'), STANDARD)
    expect(v.length).toBeGreaterThan(0)
    expect(v.every((x) => x.partial)).toBe(true)
  })

  it('makes power chords', () => {
    expect(shapes('A5')[0]).toBe('x022xx')
  })

  it('follows the tuning', () => {
    const dropD = TUNINGS.dropD.pitches
    for (const v of voicingsFor(parseChord('D'), dropD)) v.notes.forEach((n) => expect(n.pitch).toBe(dropD[n.string] + n.fret))
  })

  it('has shapes for every chord in the built-in charts', () => {
    const missing = []
    for (const chart of LIBRARY) for (const { symbol, chord } of chartChords(chart)) if (!voicingsFor(chord, STANDARD).length) missing.push(symbol)
    expect(missing).toEqual([])
  })
})

describe('chart chords', () => {
  const chart = { time: '4/4', sections: [{ label: 'A', bars: ['C', 'Am7 /', '%', '', 'F G7', 'NC', 'C/E'] }] }

  it('lists each chord once in order', () => {
    expect(chartChords(chart).map((c) => c.symbol)).toEqual(['C', 'Am7', 'F', 'G7', 'C/E'])
  })

  it('knows which chord sounds in each bar', () => {
    expect(barSymbols(compileChart(chart))).toEqual([['C'], ['Am7'], ['Am7'], ['Am7'], ['F', 'G7'], [], ['C/E']])
  })
})
