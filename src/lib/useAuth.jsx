import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { fetchProviders, friendlyAuthError, hasStoredSession, readAuthRedirect, redirectUrl } from './auth.js'
import { sharedConfig } from './sharedResources.js'
import { authEnabled, getSupabase } from './supabaseClient.js'

// Who is logged in, shared by the whole app. `status` is 'off' (no Supabase configured), 'idle' (client not
// loaded yet: nobody has logged in on this browser), 'loading', 'signedOut' or 'signedIn'.
const AuthContext = createContext(null)

const unwrap = ({ data, error }) => {
  if (error) throw new Error(friendlyAuthError(error))
  return data
}

export function AuthProvider({ children }) {
  const enabled = authEnabled()
  const [state, setState] = useState(() => {
    const redirect = readAuthRedirect()
    const fromLink = redirect.hasCode || redirect.hashIsAuth || Boolean(redirect.error)
    return {
      status: !enabled ? 'off' : hasStoredSession() || fromLink ? 'loading' : 'idle',
      user: null,
      profile: null,
        notice: '',
      error: enabled ? redirect.error : '',
      providers: {},
    }
  })
  const started = useRef(false)

  const loadProfile = useCallback(async (supabase, user) => {
    const { data } = await supabase.from('profiles').select('display_name, created_at').eq('id', user.id).maybeSingle()
    setState((s) => (s.user?.id === user.id ? { ...s, profile: data ?? null } : s))
  }, [])

  // Load the client and follow the session. Runs at once when there is a session to restore or an email link
  // to finish, otherwise the first time something asks for it (opening the Account page).
  const start = useCallback(async () => {
    if (!enabled || started.current) return getSupabase()
    started.current = true
    setState((s) => (s.status === 'idle' ? { ...s, status: 'loading' } : s))
    fetchProviders(sharedConfig).then((providers) => setState((s) => ({ ...s, providers })))
    const redirect = readAuthRedirect()
    const supabase = await getSupabase()
    supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null
      setState((s) => ({
        ...s,
        status: user ? 'signedIn' : 'signedOut',
        user,
        profile: user && user.id === s.user?.id ? s.profile : null,
      }))
      // Supabase calls this while holding its lock; fetch the profile afterwards, not inside it.
      if (user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
        setTimeout(() => loadProfile(supabase, user), 0)
      }
    })
    // Finish an email link: getSession waits for the ?code= exchange, then the URL is tidied up.
    const { error } = await supabase.auth.getSession()
    if (redirect.hasCode || redirect.hashIsAuth || redirect.error) {
      const url = new URL(window.location.href)
      for (const k of ['code', 'error', 'error_code', 'error_description']) url.searchParams.delete(k)
      if (redirect.hashIsAuth || redirect.error) url.hash = 'account'
      window.history.replaceState(null, '', url)
      if (redirect.hashIsAuth || redirect.error) window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
    if (error) setState((s) => ({ ...s, error: friendlyAuthError(error) }))
    return supabase
  }, [enabled, loadProfile])

  useEffect(() => {
    if (state.status === 'loading' && !started.current) start()
  }, [state.status, start])

  const actions = useMemo(() => {
    const run = async (fn) => {
      const supabase = await start()
      setState((s) => ({ ...s, error: '', notice: '' }))
      return fn(supabase)
    }
    return {
      start,
      clearMessages: () => setState((s) => ({ ...s, error: '', notice: '' })),
      // Leaves the site for Google, which sends people back to #account with ?code= (finished in start()).
      logInWithGoogle: () =>
        run(async (sb) => unwrap(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl('account') } }))),
      saveName: (name) =>
        run(async (sb) => {
          const { data: { user } } = await sb.auth.getUser()
          if (!user) throw new Error('You were logged out. Log in again.')
          const { data, error } = await sb.from('profiles').update({ display_name: name }).eq('id', user.id).select('display_name, created_at').single()
          if (error) throw new Error("Couldn't save your name. Try again.")
          setState((s) => ({ ...s, profile: data }))
        }),
      logOut: () => run(async (sb) => unwrap(await sb.auth.signOut())),
      deleteAccount: () =>
        run(async (sb) => {
          const { error } = await sb.rpc('delete_my_account')
          if (error) throw new Error("Couldn't delete your account. Try again.")
          // The account is gone on the server; drop the saved session in this browser too.
          await sb.auth.signOut({ scope: 'local' })
          setState((s) => ({ ...s, notice: 'Your account was deleted.' }))
        }),
    }
  }, [start])

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
