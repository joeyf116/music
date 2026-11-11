import { describe, expect, it, vi } from 'vitest'
import { applyRemote, collectLocal, notifyLocalChange, onLocalChange, plan, readMarker, syncsKey, tooBig, writeMarker } from './settingsSync.js'

const memory = (init = {}) => {
  const m = new Map(Object.entries(init))
  return {
    get length() {
      return m.size
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    dump: () => Object.fromEntries(m),
  }
}

describe('which settings sync', () => {
  it('keeps practice settings and skips drawers, timers, charts and other sites', () => {
    expect(syncsKey('music.key')).toBe(true)
    expect(syncsKey('music.practiceTab')).toBe(true)
    expect(syncsKey('music.drums.loop')).toBe(true)
    expect(syncsKey('music.chordSettingsOpen')).toBe(false)
    expect(syncsKey('music.lastSharedAt')).toBe(false)
    expect(syncsKey('music.myCharts')).toBe(false)
    expect(syncsKey('sb-abc-auth-token')).toBe(false)
    expect(syncsKey('sync.at')).toBe(false)
  })
})

describe('collect and apply', () => {
  it('collects parsed values and skips broken JSON', () => {
    const s = memory({ 'music.key': '"E"', 'music.bpm': '90', 'music.bad': '{', 'other': '1', 'music.theorySettingsOpen': 'true' })
    expect(collectLocal(s)).toEqual({ 'music.key': 'E', 'music.bpm': 90 })
  })

  it('writes only what changed, leaves other keys alone, and ignores keys that should not sync', () => {
    const s = memory({ 'music.key': '"E"', 'music.tuning': '"dropD"' })
    expect(applyRemote({ 'music.key': 'A', 'music.tuning': 'dropD', 'sb-x-auth-token': 'evil' }, s)).toEqual(['music.key'])
    expect(s.dump()).toEqual({ 'music.key': '"A"', 'music.tuning': '"dropD"' })
  })
})

describe('plan', () => {
  const row = { updated_at: '2026-11-11T17:00:00Z' }
  it('pushes from the first device', () => expect(plan(null, { user: null, at: null }, 'u1', false)).toBe('push'))
  it('pulls on a new device or after someone else', () => {
    expect(plan(row, { user: null, at: null }, 'u1', true)).toBe('pull')
    expect(plan(row, { user: 'u2', at: '2026-11-11T18:00:00Z' }, 'u1', false)).toBe('pull')
  })
  it('pulls when another device saved since, else pushes only if changed', () => {
    expect(plan(row, { user: 'u1', at: '2026-11-11T16:00:00Z' }, 'u1', true)).toBe('pull')
    expect(plan(row, { user: 'u1', at: '2026-11-11T17:00:00Z' }, 'u1', true)).toBe('push')
    expect(plan(row, { user: 'u1', at: '2026-11-11T17:00:00Z' }, 'u1', false)).toBe('none')
  })
})

describe('markers, size and change events', () => {
  it('remembers who synced and when', () => {
    const s = memory()
    writeMarker('u1', '2026-11-11T17:00:00Z', s)
    expect(readMarker(s)).toEqual({ user: 'u1', at: '2026-11-11T17:00:00Z' })
  })

  it('refuses a runaway blob', () => {
    expect(tooBig({ 'music.x': 'a'.repeat(250_000) })).toBe(true)
    expect(tooBig({ 'music.key': 'A' })).toBe(false)
  })

  it('tells listeners about synced keys only', () => {
    const fn = vi.fn()
    const stop = onLocalChange(fn)
    notifyLocalChange('music.key')
    notifyLocalChange('music.chordSettingsOpen')
    stop()
    notifyLocalChange('music.key')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
