// Links any visitor can add, stored in a Supabase table (see supabase/schema.sql).
// Talks to Supabase's REST API with plain fetch, so there's no extra dependency.
// Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY the shared list is simply turned off.
import { LEVELS, normalizeTags, RESOURCE_TYPES, safeUrl } from './resources.js'

export const LIMITS = { title: 120, url: 500, category: 40, description: 200 }
export const COOLDOWN_MS = 30_000

const env = import.meta.env ?? {}
export const sharedConfig = {
  url: env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? '',
  key: env.VITE_SUPABASE_ANON_KEY ?? '',
}
export const sharingEnabled = (config = sharedConfig) => Boolean(config.url && config.key)

// `accessToken` (a logged-in user's) makes the request as that user, so the database knows who shared what.
const headers = (config, accessToken) => ({ apikey: config.key, Authorization: `Bearer ${accessToken || config.key}`, 'Content-Type': 'application/json' })

/** A random secret kept in this browser so whoever added a link can remove it again (charts, and links from before accounts). */
export const newOwnerToken = () => globalThis.crypto.randomUUID()

/** Check and tidy a visitor's submission. Returns `{ link }` or `{ error }`. */
export const validateSubmission = (draft) => {
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
  const raw = clean(draft.url)
  const url = /^https?:\/\//i.test(raw) ? safeUrl(raw) : null
  if (!url) return { error: 'Enter a full link starting with http:// or https://.' }
  if (url.length > LIMITS.url) return { error: 'That link is too long.' }
  const link = {
    title: clean(draft.title) || new URL(url).hostname.replace(/^www\./, ''),
    url,
    category: clean(draft.category) || 'Shared links',
    type: RESOURCE_TYPES.includes(draft.type) ? draft.type : 'Other',
    level: LEVELS.includes(draft.level) ? draft.level : '',
    tags: normalizeTags(draft.tags),
    description: clean(draft.description),
  }
  for (const field of ['title', 'category', 'description']) {
    if (link[field].length > LIMITS[field]) return { error: `Keep the ${field} under ${LIMITS[field]} characters.` }
  }
  return { link }
}

const failure = async (res, fallback) => {
  const body = await res.json().catch(() => ({}))
  if (body.code === '23505') return new Error('That link is already in the catalog.')
  if (body.message?.includes('slow down')) return new Error('Lots of links were just added. Try again in a few minutes.')
  if (body.message?.includes('Log in') || res.status === 401) return new Error('Log in to share a link with everyone.')
  return new Error(`${fallback} (${res.status}). Try again later.`)
}

const BASE_FIELDS = 'id,title,url,category,type,level,tags,description,created_at'

/** Every shared link, newest first, with who shared it (`owner`, `author_name`) once accounts are set up. */
export async function fetchSharedLinks(config = sharedConfig, fetchImpl = fetch) {
  const load = (fields) => fetchImpl(`${config.url}/rest/v1/resources?select=${fields}&order=created_at.desc`, { headers: headers(config) })
  let res = await load(`${BASE_FIELDS},owner,author_name`)
  // Before supabase/resources-accounts.sql has run, those two columns don't exist (or aren't readable).
  if (res.status === 400 || res.status === 401 || res.status === 403) res = await load(BASE_FIELDS)
  if (!res.ok) throw await failure(res, "Couldn't load shared links")
  return res.json()
}

const rpc = async (name, args, config, fetchImpl, fallback, accessToken) => {
  const res = await fetchImpl(`${config.url}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(config, accessToken), body: JSON.stringify(args) })
  if (!res.ok) throw await failure(res, fallback)
  return res.json()
}

/** Shares a link with everyone as the logged-in user; resolves to the catalog entry including its new id. */
export async function shareLink(link, accessToken, user, config = sharedConfig, fetchImpl = fetch) {
  const id = await rpc('share_resource', link, config, fetchImpl, "Couldn't share the link", accessToken)
  return { ...link, id, owner: user.id, author_name: user.name, created_at: new Date().toISOString() }
}

/** Shares a link anonymously with a browser token. Only the mobile app still uses it, until it gets log in (phase 4). */
export async function addSharedLink(link, ownerToken, config = sharedConfig, fetchImpl = fetch) {
  const id = await rpc('add_resource', { ...link, token: ownerToken }, config, fetchImpl, "Couldn't share the link")
  return { ...link, id, created_at: new Date().toISOString() }
}

/** Removes a link you shared while logged in. Resolves to false if it isn't yours. */
export const removeMyLink = (id, accessToken, config = sharedConfig, fetchImpl = fetch) =>
  rpc('remove_my_resource', { resource_id: id }, config, fetchImpl, "Couldn't remove the link", accessToken)

/** Removes a link this browser added before accounts (by its secret token). Resolves to false if it doesn't match. */
export const removeSharedLink = (id, ownerToken, config = sharedConfig, fetchImpl = fetch) =>
  rpc('remove_resource', { resource_id: id, token: ownerToken }, config, fetchImpl, "Couldn't remove the link")

/** Flags a link as spam or broken; it's hidden automatically after a few reports. */
export const reportSharedLink = (id, reason, config = sharedConfig, fetchImpl = fetch) =>
  rpc('report_resource', { resource_id: id, reason }, config, fetchImpl, "Couldn't send the report")
