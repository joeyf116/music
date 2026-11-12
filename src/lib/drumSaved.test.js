import { describe, expect, it } from 'vitest'
import { presetById } from './drumPresets.js'
import { SAVED_MAX, cleanName, findGroove, removeSaved, saveGroove, updateSaved, validSaved } from './drumSaved.js'

const rock = presetById('basic-rock')

describe('saved grooves', () => {
  it('saves a copy with its own id, name, kit and tempo, newest first', () => {
    const { list, groove } = saveGroove([], rock, { name: '  Verse   groove ', kit: 'jazz', bpm: 92, now: 1000 })
    expect(groove).toMatchObject({ id: 'saved-rs', name: 'Verse groove', style: 'Saved', kit: 'jazz', bpm: 92, tracks: rock.tracks })
    const next = saveGroove(list, rock, { name: '', kit: 'rock', bpm: 120, now: 2000 })
    expect(next.list.map((g) => g.name)).toEqual(['My groove', 'Verse groove'])
  })

  it('keeps at most SAVED_MAX', () => {
    let list = []
    for (let i = 0; i < SAVED_MAX + 5; i++) list = saveGroove(list, rock, { name: `g${i}`, kit: 'rock', bpm: 100, now: i + 1 }).list
    expect(list).toHaveLength(SAVED_MAX)
    expect(list[0].name).toBe(`g${SAVED_MAX + 4}`)
  })

  it('updates in place and removes', () => {
    const { list, groove } = saveGroove([], rock, { name: 'A', kit: 'rock', bpm: 100, now: 5 })
    const changed = { ...rock, tracks: { ...rock.tracks, kick: rock.tracks.kick.replace(/\./, 'x') } }
    const updated = updateSaved(list, groove.id, changed, { kit: 'lofi', bpm: 80 })
    expect(updated[0]).toMatchObject({ id: groove.id, name: 'A', kit: 'lofi', bpm: 80, tracks: changed.tracks })
    expect(removeSaved(updated, groove.id)).toEqual([])
  })

  it('finds yours first, then the ready-made ones, and drops broken entries', () => {
    const { list, groove } = saveGroove([], rock, { name: 'Mine', kit: 'rock', bpm: 100, now: 7 })
    expect(findGroove(groove.id, list).name).toBe('Mine')
    expect(findGroove('basic-rock', list).name).toBe(rock.name)
    expect(validSaved([{ id: 'x', name: 'bad' }, null, ...list])).toHaveLength(1)
    expect(validSaved('nope')).toEqual([])
  })

  it('cleans names', () => {
    expect(cleanName('x'.repeat(60), 'f')).toHaveLength(40)
    expect(cleanName('   ', 'fallback')).toBe('fallback')
  })
})
