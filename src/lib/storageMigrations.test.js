import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrateSettings } from './storageMigrations.js'

const memory = (data = {}) => {
  const map = new Map(Object.entries(data).map(([k, v]) => [k, JSON.stringify(v)]))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    get: (k) => (map.has(k) ? JSON.parse(map.get(k)) : undefined),
  }
}

describe('migrateSettings', () => {
  it("moves the quiz's 'both' off the practice tab's setting", () => {
    const s = memory({ 'music.chordStyle': 'both' })
    expect(migrateSettings(s)).toEqual(['music.quizPlayStyle', 'music.chordStyle'])
    expect(s.get('music.quizPlayStyle')).toBe('both')
    expect(s.get('music.chordStyle')).toBe('strum')
  })

  it("keeps a quiz style that's already saved", () => {
    const s = memory({ 'music.chordStyle': 'both', 'music.quizPlayStyle': 'arpeggio' })
    migrateSettings(s)
    expect(s.get('music.quizPlayStyle')).toBe('arpeggio')
    expect(s.get('music.chordStyle')).toBe('strum')
  })

  it('leaves practice tab values alone and runs again harmlessly', () => {
    for (const v of ['strum', 'arpeggio', 'block']) {
      const s = memory({ 'music.chordStyle': v })
      expect(migrateSettings(s)).toEqual([])
      expect(s.get('music.chordStyle')).toBe(v)
    }
    expect(migrateSettings(memory())).toEqual([])
  })

  it('survives blocked storage', () => {
    const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(migrateSettings(blocked)).toEqual([])
  })
})

// Two pages saving under one key is how the chord-style mix-up happened: any key used in more than one place must
// start from the same default, so it holds the same kind of value everywhere.
describe('saved setting keys', () => {
  const dirs = ['src/components', 'src/lib']
  const uses = {}
  for (const dir of dirs) {
    for (const file of readdirSync(dir)) {
      if (!/\.jsx?$/.test(file) || file.includes('.test.')) continue
      const text = readFileSync(join(dir, file), 'utf8')
      for (const m of text.matchAll(/usePersistentState\('(music\.[\w.]+)',\s*([^)]*?)\)/g)) {
        ;(uses[m[1]] ??= new Set()).add(m[2].trim())
      }
    }
  }

  it('found the settings', () => {
    expect(Object.keys(uses).length).toBeGreaterThan(20)
  })

  it.each(Object.entries(uses).filter(([, d]) => d.size > 1))('%s has one default everywhere', (key, defaults) => {
    expect([...defaults]).toHaveLength(1)
  })
})
