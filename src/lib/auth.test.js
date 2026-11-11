import { describe, expect, it } from 'vitest'
import { displayName, friendlyAuthError, hasStoredSession, initialOf, readAuthRedirect, redirectUrl, validateAuthForm, validateDisplayName } from './auth.js'

const loc = (href) => {
  const u = new URL(href)
  return { origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash }
}

describe('validateAuthForm', () => {
  it('tidies a sign up', () => {
    expect(validateAuthForm('signup', { email: ' Joe@Example.COM ', password: 'longenough', name: '  Joe   F ' })).toEqual({
      values: { email: 'joe@example.com', password: 'longenough', name: 'Joe F' },
    })
  })

  it('asks for a real email, a long enough password and a short name', () => {
    expect(validateAuthForm('signup', { email: 'joe', password: 'longenough' }).error).toMatch(/email/)
    expect(validateAuthForm('signup', { email: 'a@b.co', password: 'short' }).error).toMatch(/at least 8/)
    expect(validateAuthForm('signup', { email: 'a@b.co', password: 'longenough', name: 'x'.repeat(41) }).error).toMatch(/under 40/)
    expect(validateAuthForm('signup', { email: 'a@b.co', password: 'x'.repeat(73) }).error).toMatch(/under 72/)
  })

  it('only needs some password to log in, and only an email to reset', () => {
    expect(validateAuthForm('login', { email: 'a@b.co', password: 'x' })).toEqual({ values: { email: 'a@b.co', password: 'x' } })
    expect(validateAuthForm('login', { email: 'a@b.co', password: '' }).error).toMatch(/password/)
    expect(validateAuthForm('reset', { email: 'a@b.co' })).toEqual({ values: { email: 'a@b.co' } })
    expect(validateAuthForm('password', { password: 'newpassword' })).toEqual({ values: { password: 'newpassword' } })
  })
})

describe('validateDisplayName', () => {
  it('trims, clears when empty and limits length', () => {
    expect(validateDisplayName('  Ann  ')).toEqual({ name: 'Ann' })
    expect(validateDisplayName('   ')).toEqual({ name: null })
    expect(validateDisplayName('x'.repeat(41)).error).toBeTruthy()
  })
})

describe('friendlyAuthError', () => {
  it('words known codes plainly and falls back to the message', () => {
    expect(friendlyAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toMatch(/don't match/)
    expect(friendlyAuthError({ status: 429, message: 'x' })).toMatch(/Too many/)
    expect(friendlyAuthError(new TypeError('Failed to fetch'))).toMatch(/connection/)
    expect(friendlyAuthError({ message: 'Odd thing' })).toBe('Odd thing')
    expect(friendlyAuthError(null)).toBe('')
  })
})

describe('names', () => {
  it('prefers the profile name, then the email', () => {
    const user = { email: 'joey@example.com', user_metadata: {} }
    expect(displayName(user, { display_name: 'Joey F' })).toBe('Joey F')
    expect(displayName(user, null)).toBe('joey')
    expect(displayName(null, null)).toBe('')
    expect(initialOf('joey')).toBe('J')
  })
})

describe('redirects', () => {
  it('sends email links back to a hash page without the query', () => {
    expect(redirectUrl('account', loc('https://joeyf116.github.io/music/?code=1#charts'))).toBe('https://joeyf116.github.io/music/#account')
  })

  it('spots a PKCE code and errors in the query or the hash', () => {
    expect(readAuthRedirect(loc('https://x.io/music/?code=abc#account'))).toEqual({ hasCode: true, error: '', hashIsAuth: false })
    const hashError = readAuthRedirect(loc('https://x.io/music/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'))
    expect(hashError.hashIsAuth).toBe(true)
    expect(hashError.error).toMatch(/expired/)
    expect(readAuthRedirect(loc('https://x.io/music/?error=server_error&error_description=Boom#account')).error).toBe('Boom')
    expect(readAuthRedirect(loc('https://x.io/music/#charts'))).toEqual({ hasCode: false, error: '', hashIsAuth: false })
  })

  it('finds a saved session in storage', () => {
    const store = (keys) => ({ length: keys.length, key: (i) => keys[i] })
    expect(hasStoredSession(store(['music.key', 'sb-abc-auth-token']))).toBe(true)
    expect(hasStoredSession(store(['music.key']))).toBe(false)
  })
})
