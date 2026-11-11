// Accounts (log in / sign up) with Supabase Auth. See supabase/accounts.sql and supabase/README.md.
// This file holds the plain helpers (checking the form, wording errors, reading the redirect), so they can
// be tested without a network. The Supabase client itself is loaded on demand in supabaseClient.js.

export const NAME_MAX = 40
export const PASSWORD_MIN = 8

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Check the log in / sign up form before it goes anywhere.
 * mode: 'login' | 'signup' | 'reset' (send a reset link) | 'password' (choose a new password).
 * Returns `{ values }` (tidied) or `{ error }`.
 */
export function validateAuthForm(mode, draft) {
  const email = String(draft.email ?? '').trim().toLowerCase()
  const password = String(draft.password ?? '')
  const name = String(draft.name ?? '').replace(/\s+/g, ' ').trim()
  if (mode !== 'password' && !EMAIL_RE.test(email)) return { error: 'Enter your email address, like name@example.com.' }
  if (mode === 'reset') return { values: { email } }
  if (mode === 'login') return password ? { values: { email, password } } : { error: 'Enter your password.' }
  if (password.length < PASSWORD_MIN) return { error: `Use at least ${PASSWORD_MIN} characters for your password.` }
  if (password.length > 72) return { error: 'Keep your password under 72 characters.' }
  if (mode === 'password') return { values: { password } }
  if (name.length > NAME_MAX) return { error: `Keep your name under ${NAME_MAX} characters.` }
  return { values: { email, password, name } }
}

/** Tidy a display name for the profile. Returns `{ name }` (null clears it) or `{ error }`. */
export function validateDisplayName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (name.length > NAME_MAX) return { error: `Keep your name under ${NAME_MAX} characters.` }
  return { name: name || null }
}

// Supabase Auth error codes → plain words. Anything unknown falls back to the server's message.
const MESSAGES = {
  invalid_credentials: "That email and password don't match. Check them, or reset your password.",
  email_not_confirmed: 'Confirm your email first: open the link we sent you, then log in.',
  user_already_exists: 'There is already an account with that email. Log in instead.',
  email_exists: 'There is already an account with that email. Log in instead.',
  weak_password: 'Choose a stronger password: longer, and not a common one.',
  same_password: 'That is your current password. Choose a new one.',
  over_email_send_rate_limit: 'Too many emails were sent just now. Try again in an hour.',
  over_request_rate_limit: 'Too many tries. Wait a minute and try again.',
  email_address_not_authorized: "We can't send email to that address yet. Try again later.",
  email_address_invalid: "That email address can't be used. Try another one.",
  signup_disabled: 'New accounts are switched off for now.',
  session_not_found: 'You were logged out. Log in again.',
  refresh_token_not_found: 'You were logged out. Log in again.',
  flow_state_not_found: 'That link has expired or was opened in another browser. Log in, or ask for a new link.',
  flow_state_expired: 'That link has expired. Ask for a new one.',
  otp_expired: 'That link has expired. Ask for a new one.',
  reauthentication_needed: 'Log in again to change your password.',
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

/** The name to show for someone: their profile name, else the part of their email before the @. */
export function displayName(user, profile) {
  if (!user) return ''
  return profile?.display_name || user.user_metadata?.display_name || (user.email ?? '').split('@')[0] || 'You'
}

/** One letter for the round account button. */
export const initialOf = (name) => (name.trim()[0] ?? '?').toUpperCase()

/**
 * The page to send email links back to: this site, opening a given hash page.
 * Uses the query-free URL so a stale ?code= is never sent back.
 */
export const redirectUrl = (page, location = globalThis.location) => `${location.origin}${location.pathname}#${page}`

/**
 * Read what Supabase put on the URL after an email link: `?code=` (PKCE, handled by the client) and/or an
 * error, either in the query (`?error_description=`) or the hash (`#error=…&error_description=…`).
 */
export function readAuthRedirect(location = globalThis.location) {
  const query = new URLSearchParams(location.search)
  const hashText = location.hash.replace(/^#\/?/, '')
  const hash = /^(error|access_token)=|&error=/.test(hashText) ? new URLSearchParams(hashText) : new URLSearchParams()
  const pick = (k) => query.get(k) ?? hash.get(k)
  const description = pick('error_description')
  const code = pick('error_code')
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
