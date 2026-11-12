// Settings that follow your account (phase 2 of accounts). Every practice setting the app saves in this
// browser under `music.*` (key, scale, tuning, tempo, practice tab, starred links, quiz scores, drum loop…)
// is also kept in one row of `user_settings` in Supabase (see supabase/settings.sql), so logging in on a
// new device brings them along. One rule decides conflicts: the most recent save wins, as a whole.

import { migrateSettings } from './storageMigrations.js'

const PREFIX = 'music.'
// Left out: whether a drawer is open (a per-screen habit) and anti-spam timers. Charts are going away.
const SKIP = [/Open$/, /^music\.last\w*SharedAt$/, /^music\.(openChart|myCharts|mySharedCharts|chart\w*)$/]
export const SYNC_USER = 'sync.user'
export const SYNC_AT = 'sync.at'
export const MAX_BYTES = 200_000
export const SYNC_EVENT = 'music:settings-replaced'

export const syncsKey = (key) => typeof key === 'string' && key.startsWith(PREFIX) && !SKIP.some((re) => re.test(key))

/** Every synced setting in this browser, as `{ key: parsedValue }`. */
export function collectLocal(storage = globalThis.localStorage) {
  const data = {}
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (!syncsKey(key)) continue
      try {
        data[key] = JSON.parse(storage.getItem(key))
      } catch {
        // Not JSON: not one of ours.
      }
    }
  } catch {
    // Storage blocked: nothing to sync.
  }
  return data
}

/** Write an account's settings into this browser. Keys the account doesn't have are left alone. */
export function applyRemote(data, storage = globalThis.localStorage) {
  const changed = []
  for (const [key, value] of Object.entries(data ?? {})) {
    if (!syncsKey(key)) continue
    const text = JSON.stringify(value)
    try {
      if (storage.getItem(key) === text) continue
      storage.setItem(key, text)
      changed.push(key)
    } catch {
      return changed
    }
  }
  // Another device may still be on an older version: fix up what it sent.
  for (const key of migrateSettings(storage)) if (!changed.includes(key)) changed.push(key)
  return changed
}

/**
 * What to do when you log in (or come back to the tab), given the account's row and what this browser
 * last synced. Returns 'push' (this browser's settings go up), 'pull' (the account's come down) or 'none'.
 * - No row yet: this is the account's first device, so its settings become the account's.
 * - This browser never synced with this account (a new device, or someone else was logged in): pull.
 * - The row changed since this browser last synced (another device saved): pull.
 * - Otherwise this browser is up to date, and pushes if it changed something meanwhile.
 */
export function plan(row, marker, userId, dirty) {
  if (!row) return 'push'
  if (marker.user !== userId || !marker.at) return 'pull'
  if (Date.parse(row.updated_at) > Date.parse(marker.at)) return 'pull'
  return dirty ? 'push' : 'none'
}

export function readMarker(storage = globalThis.localStorage) {
  try {
    return { user: storage.getItem(SYNC_USER), at: storage.getItem(SYNC_AT) }
  } catch {
    return { user: null, at: null }
  }
}

export function writeMarker(userId, at, storage = globalThis.localStorage) {
  try {
    storage.setItem(SYNC_USER, userId)
    storage.setItem(SYNC_AT, at)
  } catch {
    // Storage blocked: we'll just pull again next time.
  }
}

/** Too big to keep in the account (a runaway list, say)? Then it stays in this browser only. */
export const tooBig = (data) => new Blob([JSON.stringify(data)]).size > MAX_BYTES

// usePersistentState calls this after saving a setting, so the change can be sent up shortly after.
const listeners = new Set()
export const onLocalChange = (fn) => (listeners.add(fn), () => listeners.delete(fn))
export const notifyLocalChange = (key) => {
  if (syncsKey(key)) listeners.forEach((fn) => fn(key))
}
