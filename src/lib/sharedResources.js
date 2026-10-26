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

const headers = (config) => ({ apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' })

/** A random secret kept in this browser so whoever added a link can remove it again. */
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
  return new Error(`${fallback} (${res.status}). Try again later.`)
}

export async function fetchSharedLinks(config = sharedConfig, fetchImpl = fetch) {
  const res = await fetchImpl(`${config.url}/rest/v1/resources?select=id,title,url,category,type,level,tags,description,created_at&order=created_at.desc`, {
    headers: headers(config),
  })
  if (!res.ok) throw await failure(res, "Couldn't load shared links")
  return res.json()
}

const rpc = async (name, args, config, fetchImpl, fallback) => {
  const res = await fetchImpl(`${config.url}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(config), body: JSON.stringify(args) })
  if (!res.ok) throw await failure(res, fallback)
  return res.json()
}

/** Shares a link with everyone; resolves to the catalog entry including its new id. */
export async function addSharedLink(link, ownerToken, config = sharedConfig, fetchImpl = fetch) {
  const id = await rpc('add_resource', { ...link, token: ownerToken }, config, fetchImpl, "Couldn't share the link")
  return { ...link, id, created_at: new Date().toISOString() }
}

/** Removes a link this browser added. Resolves to false if the token doesn't match. */
export const removeSharedLink = (id, ownerToken, config = sharedConfig, fetchImpl = fetch) =>
  rpc('remove_resource', { resource_id: id, token: ownerToken }, config, fetchImpl, "Couldn't remove the link")

/** Flags a link as spam or broken; it's hidden automatically after a few reports. */
export const reportSharedLink = (id, reason, config = sharedConfig, fetchImpl = fetch) =>
  rpc('report_resource', { resource_id: id, reason }, config, fetchImpl, "Couldn't send the report")
