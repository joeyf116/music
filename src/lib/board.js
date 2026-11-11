// The Community board (#community): posts about what you're working on or need help with, and replies.
// Stored in Supabase (supabase/community.sql). Plain helpers here are tested; the queries take a client.

export const BODY_MAX = 2000
export const PAGE_SIZE = 20

export const KINDS = [
  { value: 'working', label: 'Working on' },
  { value: 'help', label: 'Need help' },
]

export const kindLabel = (kind) => KINDS.find((k) => k.value === kind)?.label ?? ''

const COLUMNS = 'id, parent_id, author, author_name, kind, body, created_at'

/** Tidy a post before sending it. Returns `{ body }` or `{ error }`. */
export function validateBody(raw, max = BODY_MAX) {
  const body = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!body) return { error: 'Write something first.' }
  if (body.length > max) return { error: `Keep it under ${max} characters.` }
  return { body }
}

/** Attach each reply to its post, oldest reply first. Replies whose post isn't in the list are dropped. */
export function threadPosts(posts, replies) {
  const byPost = new Map(posts.map((p) => [p.id, []]))
  for (const r of [...replies].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    byPost.get(r.parent_id)?.push(r)
  }
  return posts.map((p) => ({ ...p, replies: byPost.get(p.id) }))
}

/** "just now", "5m", "3h", "2d", then a date ("Nov 3", or "Nov 3, 2025" in another year). */
export function timeAgo(iso, now = Date.now()) {
  const then = new Date(iso)
  const s = Math.max(0, Math.round((now - then.getTime()) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`
  const sameYear = then.getFullYear() === new Date(now).getFullYear()
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

/** Plain words for whatever the database or network said. */
export function friendlyBoardError(err) {
  const msg = err?.message ?? ''
  if (/slow down/i.test(msg)) return 'You’re posting a lot. Wait a few minutes and try again.'
  if (/post is gone/i.test(msg)) return 'That post was removed.'
  if (/log in/i.test(msg) || err?.code === '28000' || err?.code === '42501') return 'Log in to post.'
  if (/failed to fetch|network/i.test(msg) || err instanceof TypeError) return "Couldn't reach the server. Check your connection and try again."
  return 'Something went wrong. Try again.'
}

const unwrap = ({ data, error }) => {
  if (error) throw new Error(friendlyBoardError(error))
  return data
}

/**
 * One page of posts, newest first, with all their replies. `before` is the created_at of the last post
 * already shown, to load older ones. Returns `{ posts, more }`.
 */
export async function fetchBoard(supabase, { kind = 'all', before = null, limit = PAGE_SIZE } = {}) {
  let query = supabase.from('board_posts').select(COLUMNS).is('parent_id', null)
  if (kind !== 'all') query = query.eq('kind', kind)
  if (before) query = query.lt('created_at', before)
  const rows = unwrap(await query.order('created_at', { ascending: false }).limit(limit + 1))
  const posts = rows.slice(0, limit)
  const replies = posts.length
    ? unwrap(await supabase.from('board_posts').select(COLUMNS).in('parent_id', posts.map((p) => p.id)).order('created_at'))
    : []
  return { posts: threadPosts(posts, replies), more: rows.length > limit }
}

/** Post (no parentId) or reply. Returns the new row as stored, with the author's name filled in. */
export async function addPost(supabase, { kind = null, body, parentId = null }) {
  const row = parentId ? { parent_id: parentId, body } : { kind, body }
  return unwrap(await supabase.from('board_posts').insert(row).select(COLUMNS).single())
}

export async function deletePost(supabase, id) {
  unwrap(await supabase.from('board_posts').delete().eq('id', id))
}

export async function reportPost(supabase, id) {
  unwrap(await supabase.rpc('report_board_post', { post_id: id }))
}
