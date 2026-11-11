// Accounts with Supabase Auth: log in with Google only. See supabase/accounts.sql and supabase/README.md.
// This file holds the plain helpers (wording errors, reading the redirect, names), so they can be tested
// without a network. The Supabase client itself is loaded on demand in supabaseClient.js.

export const NAME_MAX = 40

/** Tidy a display name for the profile. Returns `{ name }` (null clears it) or `{ error }`. */
export function validateDisplayName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (name.length > NAME_MAX) return { error: `Keep your name under ${NAME_MAX} characters.` }
  return { name: name || null }
}

// Supabase Auth error codes → plain words. Anything unknown falls back to the server's message.
const MESSAGES = {
  over_request_rate_limit: 'Too many tries. Wait a minute and try again.',
  signup_disabled: 'New accounts are switched off for now.',
  session_not_found: 'You were logged out. Log in again.',
  refresh_token_not_found: 'You were logged out. Log in again.',
  flow_state_not_found: 'That sign-in was started in another browser or has expired. Try again.',
  flow_state_expired: 'That sign-in took too long. Try again.',
  bad_oauth_state: 'That sign-in took too long. Try again.',
  provider_disabled: "Google sign-in isn't switched on yet. Try again later.",
  validation_failed: "Google sign-in isn't switched on yet. Try again later.",
  access_denied: 'Google sign-in was cancelled.',
}

export function friendlyAuthError(err) {
  if (!err) return ''
  const code = err.code ?? err.error_code
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (err.status === 429) return MESSAGES.over_request_rate_limit
  if (err.name === 'AuthRetryableFetchError' || err.message === 'Failed to fetch' || err instanceof TypeError) {
    return "Couldn't reach the server. Check your connection and try again."
  }
  return err.message || 'Something went wrong. Try again.'
}

/** The name to show for someone: their profile name, then the name Google gave, then their email's first part. */
export function displayName(user, profile) {
  if (!user) return ''
  const meta = user.user_metadata ?? {}
  return profile?.display_name || meta.display_name || meta.full_name || meta.name || (user.email ?? '').split('@')[0] || 'You'
}

/** One letter for the round account button. */
export const initialOf = (name) => (name.trim()[0] ?? '?').toUpperCase()

/**
 * The page Google sign-in sends people back to: this site, opening a given hash page.
 * Uses the query-free URL so a stale ?code= is never sent back.
 */
export const redirectUrl = (page, location = globalThis.location) => `${location.origin}${location.pathname}#${page}`

/**
 * Read what Supabase put on the URL after Google sign-in: `?code=` (PKCE, handled by the client) and/or an
 * error, either in the query (`?error_description=`) or the hash (`#error=…&error_description=…`).
 */
export function readAuthRedirect(location = globalThis.location) {
  const query = new URLSearchParams(location.search)
  const hashText = location.hash.replace(/^#\/?/, '')
  const hash = /^(error|access_token)=|&error=/.test(hashText) ? new URLSearchParams(hashText) : new URLSearchParams()
  const pick = (k) => query.get(k) ?? hash.get(k)
  const description = pick('error_description')
  const code = pick('error_code') ?? pick('error')
  return {
    hasCode: query.has('code'),
    error: description || pick('error') ? friendlyAuthError({ code, message: description?.replace(/\+/g, ' ') }) : '',
    // An error in the hash replaces the page name, so the page has to be put back.
    hashIsAuth: hash.size > 0,
  }
}

/** True when this browser holds a saved Supabase session, so the client is worth loading straight away. */
export function hasStoredSession(storage = globalThis.localStorage) {
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k?.startsWith('sb-') && k.endsWith('-auth-token')) return true
    }
  } catch {
    // Storage can be blocked (private mode); then there is no saved session either.
  }
  return false
}

/**
 * Which sign-in providers are switched on in the Supabase dashboard, from its public settings endpoint.
 * Returns `{ google: true | false }`, or `{}` when it can't tell (then the button stays available).
 */
export async function fetchProviders(config, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key } })
    if (!res.ok) return {}
    const body = await res.json()
    return { google: Boolean(body?.external?.google) }
  } catch {
    return {}
  }
}
