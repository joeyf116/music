import { describe, expect, it } from 'vitest'
import { displayName, fetchProviders, friendlyAuthError, hasStoredSession, initialOf, readAuthRedirect, redirectUrl, validateDisplayName } from './auth.js'

const loc = (href) => {
  const u = new URL(href)
  return { origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash }
}

describe('validateDisplayName', () => {
  it('trims, clears when empty and limits length', () => {
    expect(validateDisplayName('  Ann  ')).toEqual({ name: 'Ann' })
    expect(validateDisplayName('   ')).toEqual({ name: null })
    expect(validateDisplayName('x'.repeat(41)).error).toBeTruthy()
  })
})

describe('friendlyAuthError', () => {
  it('words known codes plainly and falls back to the message', () => {
    expect(friendlyAuthError({ code: 'provider_disabled', message: 'Unsupported provider' })).toMatch(/isn't switched on/)
    expect(friendlyAuthError({ status: 429, message: 'x' })).toMatch(/Too many/)
    expect(friendlyAuthError(new TypeError('Failed to fetch'))).toMatch(/connection/)
    expect(friendlyAuthError({ message: 'Odd thing' })).toBe('Odd thing')
    expect(friendlyAuthError(null)).toBe('')
  })
})

describe('names', () => {
  it('prefers the profile name, then the name Google gives, then the email', () => {
    const user = { email: 'joey@example.com', user_metadata: {} }
    expect(displayName(user, { display_name: 'Joey F' })).toBe('Joey F')
    expect(displayName({ ...user, user_metadata: { full_name: 'Ann Lee' } }, null)).toBe('Ann Lee')
    expect(displayName(user, null)).toBe('joey')
    expect(displayName(null, null)).toBe('')
    expect(initialOf('joey')).toBe('J')
  })
})

describe('redirects', () => {
  it('sends Google back to a hash page without the query', () => {
    expect(redirectUrl('account', loc('https://joeyf116.github.io/music/?code=1#charts'))).toBe('https://joeyf116.github.io/music/#account')
  })

  it('spots a PKCE code and errors in the query or the hash', () => {
    expect(readAuthRedirect(loc('https://x.io/music/?code=abc#account'))).toEqual({ hasCode: true, error: '', hashIsAuth: false })
    const hashError = readAuthRedirect(loc('https://x.io/music/#error=access_denied&error_description=User+cancelled'))
    expect(hashError.hashIsAuth).toBe(true)
    expect(hashError.error).toMatch(/cancelled/)
    expect(readAuthRedirect(loc('https://x.io/music/?error=server_error&error_description=Boom#account')).error).toBe('Boom')
    expect(readAuthRedirect(loc('https://x.io/music/#charts'))).toEqual({ hasCode: false, error: '', hashIsAuth: false })
  })

  it('finds a saved session in storage', () => {
    const store = (keys) => ({ length: keys.length, key: (i) => keys[i] })
    expect(hasStoredSession(store(['music.key', 'sb-abc-auth-token']))).toBe(true)
    expect(hasStoredSession(store(['music.key']))).toBe(false)
  })
})

describe('fetchProviders', () => {
  it('reads whether Google is on, and says nothing when it cannot tell', async () => {
    const reply = (body) => async () => ({ ok: true, json: async () => body })
    expect(await fetchProviders({ url: 'https://x', key: 'k' }, reply({ external: { google: true } }))).toEqual({ google: true })
    expect(await fetchProviders({ url: 'https://x', key: 'k' }, reply({ external: { google: false } }))).toEqual({ google: false })
    expect(await fetchProviders({ url: 'https://x', key: 'k' }, async () => ({ ok: false }))).toEqual({})
    expect(
      await fetchProviders({ url: 'https://x', key: 'k' }, async () => {
        throw new TypeError('offline')
      }),
    ).toEqual({})
  })
})
