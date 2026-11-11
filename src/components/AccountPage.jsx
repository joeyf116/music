import { useEffect, useState } from 'react'
import { NAME_MAX, displayName, validateDisplayName } from '../lib/auth.js'
import { useAuth } from '../lib/useAuth.jsx'
import { Field } from './controls.jsx'
import { Disclosure, PageHeader, Section } from './layout.jsx'

// #account: log in with Google, then your name, log out and delete account.
export default function AccountPage() {
  const auth = useAuth()
  const { status, start } = auth

  useEffect(() => {
    if (status === 'idle') start()
  }, [status, start])

  if (status === 'off') {
    return (
      <div className="page account-page">
        <PageHeader title="Account" summary="Accounts aren't switched on for this copy of the site." />
      </div>
    )
  }

  return (
    <div className="page account-page">
      {status === 'signedIn' ? <SignedIn auth={auth} /> : <SignedOut auth={auth} loading={status !== 'signedOut'} />}
    </div>
  )
}

/** The status line under a form: an error, or a short confirmation. */
function Status({ error, done }) {
  return (
    <p role="status" className={error ? 'error account-status' : 'done account-status'}>
      {error || done}
    </p>
  )
}

/** Runs one form action, tracking busy / error / done for its status line. */
function useSubmit() {
  const [state, setState] = useState({ busy: false, error: '', done: '' })
  const submit = async (fn, done = '') => {
    setState({ busy: true, error: '', done: '' })
    try {
      const result = await fn()
      setState({ busy: false, error: '', done })
      return result
    } catch (err) {
      setState({ busy: false, error: err.message, done: '' })
      return undefined
    }
  }
  return [state, submit, (error) => setState({ busy: false, error, done: '' })]
}

function SignedOut({ auth, loading }) {
  const [state, submit] = useSubmit()
  // Until the settings answer, assume Google is on; only hide the button once Supabase says it is off.
  const googleOff = auth.providers.google === false
  return (
    <>
      <PageHeader title="Log in" summary="Use your Google account. New here? The same button signs you up." />
      <div className="account-card">
        <button type="button" className="google-button" onClick={() => submit(() => auth.logInWithGoogle())} disabled={state.busy || loading || googleOff}>
          <GoogleMark />
          {state.busy ? 'Opening Google…' : 'Continue with Google'}
        </button>
        {googleOff && <p className="hint">Google sign-in isn't switched on yet. Check back soon.</p>}
        <Status error={state.error || auth.error} done={auth.notice} />
      </div>
      <p className="page-hint">Log in to keep your key, tuning, practice tab and other settings on every device. We only get your name and email from Google.</p>
    </>
  )
}

function SignedIn({ auth }) {
  const name = displayName(auth.user, auth.profile)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [accountState, submitAccount] = useSubmit()

  return (
    <>
      <PageHeader
        title={`Hi, ${name}`}
        summary={`Logged in as ${auth.user.email}`}
        actions={
          <button type="button" onClick={() => submitAccount(() => auth.logOut())} disabled={accountState.busy}>
            Log out
          </button>
        }
      />
      <Section title="Profile" className="account-card">
        {/* The profile arrives just after the session: keyed so the box fills in once it does. */}
        <ProfileForm key={auth.profile ? 'loaded' : 'loading'} auth={auth} placeholder={name} />
      </Section>
      <Disclosure label="Delete account" storageKey="music.accountSettingsOpen">
        <div className="account-danger">
          <p className="hint">Removes your account, profile and saved settings for good. Settings in this browser stay, and your Google account isn't touched.</p>
          {confirmDelete ? (
            <div className="account-actions">
              <button type="button" className="danger-button" onClick={() => submitAccount(() => auth.deleteAccount())} disabled={accountState.busy}>
                {accountState.busy ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={accountState.busy}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)}>
              Delete account…
            </button>
          )}
        </div>
      </Disclosure>
      <Status error={accountState.error || auth.error} done={auth.notice} />
      <p className="page-hint">Your settings save to your account as you go, and come with you when you log in on another device.</p>
    </>
  )
}

function ProfileForm({ auth, placeholder }) {
  const savedName = auth.profile?.display_name ?? ''
  const [draftName, setDraftName] = useState(savedName)
  const [state, submit, fail] = useSubmit()

  const save = (e) => {
    e.preventDefault()
    const { name, error } = validateDisplayName(draftName)
    if (error) return fail(error)
    submit(() => auth.saveName(name), 'Saved.')
  }

  return (
    <form className="account-form" onSubmit={save} noValidate>
      <Field label="Name" hint="shown on things you share later">
        <input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={NAME_MAX} autoComplete="nickname" placeholder={placeholder} />
      </Field>
      <button type="submit" className="primary" disabled={state.busy || draftName.trim() === savedName}>
        {state.busy ? 'Saving…' : 'Save'}
      </button>
      <Status error={state.error} done={state.done} />
    </form>
  )
}

/** Google's "G", drawn in its own colours as their sign-in guidelines ask. */
function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
