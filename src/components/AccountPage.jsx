import { useEffect, useState } from 'react'
import { NAME_MAX, PASSWORD_MIN, displayName, validateAuthForm, validateDisplayName } from '../lib/auth.js'
import { useAuth } from '../lib/useAuth.jsx'
import { Choice, Field } from './controls.jsx'
import { Disclosure, PageHeader, Section } from './layout.jsx'

// #account: log in, sign up, reset a password, and (once in) your name, password and account.
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

function PasswordInput({ value, onChange, isNew, label = 'Password' }) {
  const [shown, setShown] = useState(false)
  return (
    <Field label={label} hint={isNew ? `at least ${PASSWORD_MIN} characters` : undefined}>
      <span className="password-input">
        <input
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          minLength={isNew ? PASSWORD_MIN : undefined}
          maxLength={72}
          required
        />
        <button type="button" className="link-button" onClick={() => setShown(!shown)} aria-pressed={shown}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </span>
    </Field>
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
  const [mode, setMode] = useState('login') // login | signup | reset
  const [draft, setDraft] = useState({ name: '', email: '', password: '' })
  const [sent, setSent] = useState(null) // { kind: 'confirm' | 'reset', email }
  const [state, submit, fail] = useSubmit()
  const set = (field) => (e) => setDraft({ ...draft, [field]: e.target.value })
  const error = state.error || auth.error

  const onSubmit = async (e) => {
    e.preventDefault()
    const { values, error: invalid } = validateAuthForm(mode, draft)
    if (invalid) return fail(invalid)
    if (mode === 'login') return submit(() => auth.logIn(values))
    if (mode === 'reset') {
      const ok = await submit(() => auth.sendReset(values).then(() => true))
      if (ok) setSent({ kind: 'reset', email: values.email })
      return
    }
    const result = await submit(() => auth.signUp(values))
    if (result?.needsConfirmation) setSent({ kind: 'confirm', email: values.email })
  }

  const switchMode = (next) => {
    setMode(next)
    fail('')
    auth.clearMessages()
  }

  if (sent) {
    return (
      <>
        <PageHeader title="Check your email" summary={sent.kind === 'confirm' ? 'One more step to finish signing up.' : 'A reset link is on its way.'} />
        <div className="account-card">
          <p>
            {sent.kind === 'confirm' ? 'We sent a link to ' : "If there's an account for "}
            <strong>{sent.email}</strong>
            {sent.kind === 'confirm' ? '. Open it on this device to finish signing up.' : ', we sent it a link to choose a new password. Open it on this device.'}
          </p>
          <p className="hint">Nothing there? Check your spam folder, or wait a minute and try again.</p>
          <button
            type="button"
            onClick={() => {
              setSent(null)
              switchMode('login')
            }}
          >
            Back to log in
          </button>
        </div>
      </>
    )
  }

  const titles = {
    login: ['Log in', 'Welcome back. Log in to your account.'],
    signup: ['Sign up', 'Create a free account. It takes a few seconds.'],
    reset: ['Reset your password', "Enter your email and we'll send you a link to choose a new one."],
  }

  return (
    <>
      <PageHeader title={titles[mode][0]} summary={titles[mode][1]} />
      <form className="account-card account-form" onSubmit={onSubmit} noValidate>
        {mode !== 'reset' && (
          <Choice
            label="Account"
            hideLabel
            options={[
              { value: 'login', label: 'Log in' },
              { value: 'signup', label: 'Sign up' },
            ]}
            value={mode}
            onChange={switchMode}
          />
        )}
        {mode === 'signup' && (
          <Field label="Name" hint="optional, shown on things you share later">
            <input value={draft.name} onChange={set('name')} maxLength={NAME_MAX} autoComplete="nickname" />
          </Field>
        )}
        <Field label="Email">
          <input type="email" inputMode="email" value={draft.email} onChange={set('email')} autoComplete="email" autoCapitalize="off" spellCheck={false} required />
        </Field>
        {mode !== 'reset' && <PasswordInput value={draft.password} onChange={set('password')} isNew={mode === 'signup'} />}
        <button type="submit" className="primary" disabled={state.busy || loading}>
          {state.busy ? 'One moment…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
        </button>
        <Status error={error} done={state.done || auth.notice} />
        {mode === 'login' && (
          <button type="button" className="link-button" onClick={() => switchMode('reset')}>
            Forgot your password?
          </button>
        )}
        {mode === 'reset' && (
          <button type="button" className="link-button" onClick={() => switchMode('login')}>
            Back to log in
          </button>
        )}
      </form>
      <p className="page-hint">An account keeps your name with you. Your practice settings stay saved in this browser as before.</p>
    </>
  )
}

function SignedIn({ auth }) {
  const name = displayName(auth.user, auth.profile)
  const [password, setPassword] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [passState, submitPass, failPass] = useSubmit()
  const [accountState, submitAccount] = useSubmit()

  const savePassword = async (e) => {
    e.preventDefault()
    const { values, error } = validateAuthForm('password', { password })
    if (error) return failPass(error)
    await submitPass(() => auth.setPassword(values), 'Password changed.')
    setPassword('')
  }

  const passwordForm = (
    <form className="account-form" onSubmit={savePassword} noValidate>
      <PasswordInput label="New password" value={password} onChange={(e) => setPassword(e.target.value)} isNew />
      <button type="submit" className={auth.recovering ? 'primary' : undefined} disabled={passState.busy}>
        {passState.busy ? 'Saving…' : 'Change password'}
      </button>
      <Status error={passState.error} done={passState.done} />
    </form>
  )

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
      {auth.recovering && (
        <Section title="Choose a new password" className="account-card">
          {passwordForm}
        </Section>
      )}
      <Section title="Profile" className="account-card">
        {/* The profile arrives just after the session: keyed so the box fills in once it does. */}
        <ProfileForm key={auth.profile ? 'loaded' : 'loading'} auth={auth} placeholder={name} />
      </Section>
      <Disclosure label="Password and account" summary={auth.user.email} storageKey="music.accountSettingsOpen">
        <div className="account-settings">
          {!auth.recovering && passwordForm}
          <div className="account-danger">
            <h3>Delete account</h3>
            <p className="hint">Removes your account and profile for good. Settings saved in this browser stay.</p>
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
        </div>
      </Disclosure>
      <Status error={accountState.error || auth.error} done={auth.notice} />
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
