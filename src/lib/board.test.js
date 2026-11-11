import { describe, expect, it } from 'vitest'
import { fetchBoard, friendlyBoardError, kindLabel, threadPosts, timeAgo, validateBody } from './board.js'

describe('validateBody', () => {
  it('trims and squeezes blank lines', () => {
    expect(validateBody('  hi\r\n\r\n\r\n\nthere  ')).toEqual({ body: 'hi\n\nthere' })
  })
  it('refuses empty and too-long posts', () => {
    expect(validateBody('   ').error).toMatch(/Write something/)
    expect(validateBody('x'.repeat(11), 10).error).toMatch(/under 10/)
  })
})

describe('threadPosts', () => {
  it('puts replies under their post, oldest first, and drops strays', () => {
    const posts = [{ id: 1 }, { id: 2 }]
    const replies = [
      { id: 5, parent_id: 1, created_at: '2026-11-11T10:05:00Z' },
      { id: 4, parent_id: 1, created_at: '2026-11-11T10:01:00Z' },
      { id: 6, parent_id: 9, created_at: '2026-11-11T10:00:00Z' },
    ]
    const out = threadPosts(posts, replies)
    expect(out[0].replies.map((r) => r.id)).toEqual([4, 5])
    expect(out[1].replies).toEqual([])
  })
})

describe('timeAgo', () => {
  const now = Date.parse('2026-11-11T12:00:00Z')
  it('counts up in short units', () => {
    expect(timeAgo('2026-11-11T11:59:30Z', now)).toBe('just now')
    expect(timeAgo('2026-11-11T11:55:00Z', now)).toBe('5m')
    expect(timeAgo('2026-11-11T09:00:00Z', now)).toBe('3h')
    expect(timeAgo('2026-11-09T12:00:00Z', now)).toBe('2d')
  })
  it('shows a date after a week', () => {
    expect(timeAgo('2026-10-01T12:00:00Z', now)).not.toMatch(/d$/)
  })
})

describe('words', () => {
  it('labels kinds and errors', () => {
    expect(kindLabel('help')).toBe('Need help')
    expect(friendlyBoardError({ message: 'Too many posts, slow down' })).toMatch(/Wait a few minutes/)
    expect(friendlyBoardError({ code: '42501', message: 'permission denied' })).toBe('Log in to post.')
  })
})

/** A tiny stand-in for the Supabase query builder: records calls, answers with the next canned result. */
function fakeClient(results) {
  const calls = []
  const builder = () => {
    const chain = {}
    for (const m of ['select', 'is', 'eq', 'lt', 'in', 'order', 'limit']) {
      chain[m] = (...args) => {
        calls.push([m, ...args])
        return chain
      }
    }
    chain.then = (resolve) => resolve(results.shift())
    return chain
  }
  return { calls, from: (table) => (calls.push(['from', table]), builder()) }
}

describe('fetchBoard', () => {
  it('loads a page of posts with their replies and says when there are more', async () => {
    const posts = [
      { id: 3, created_at: '2026-11-11T10:00:00Z' },
      { id: 2, created_at: '2026-11-10T10:00:00Z' },
      { id: 1, created_at: '2026-11-09T10:00:00Z' },
    ]
    const client = fakeClient([{ data: posts }, { data: [{ id: 9, parent_id: 2, created_at: '2026-11-10T11:00:00Z' }] }])
    const out = await fetchBoard(client, { kind: 'help', limit: 2 })
    expect(out.more).toBe(true)
    expect(out.posts.map((p) => p.id)).toEqual([3, 2])
    expect(out.posts[1].replies.map((r) => r.id)).toEqual([9])
    expect(client.calls).toContainEqual(['eq', 'kind', 'help'])
    expect(client.calls).toContainEqual(['in', 'parent_id', [3, 2]])
  })

  it('turns a database error into plain words', async () => {
    const client = fakeClient([{ data: null, error: { message: 'Failed to fetch' } }])
    await expect(fetchBoard(client)).rejects.toThrow(/Couldn't reach the server/)
  })
})
