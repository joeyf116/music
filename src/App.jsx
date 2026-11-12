import { Suspense, lazy } from 'react'
import FretboardPage from './components/FretboardPage.jsx'
import Logo from './components/Logo.jsx'
import { displayName, initialOf } from './lib/auth.js'
import { KEYS, TUNINGS, pcName, usesFlats } from './lib/theory.js'
import { useAuth } from './lib/useAuth.jsx'
import { PlayerProvider } from './lib/usePlayer.jsx'
import NowPlaying from './components/NowPlaying.jsx'
import useHashPage from './lib/useHashPage.js'
import useSettingsSync from './lib/useSettingsSync.js'
import usePersistentState from './lib/usePersistentState.js'
import './App.css'
// Shared with lazy pages, but also holds the phone tab bar's short labels, so it loads up front.
import './components/Rhythm.css'

// Pages other than the Fretboard load their code the first time you open them.
const AccountPage = lazy(() => import('./components/AccountPage.jsx'))
const CommunityPage = lazy(() => import('./components/CommunityPage.jsx'))
const DrumsPage = lazy(() => import('./components/DrumsPage.jsx'))
const EarTraining = lazy(() => import('./components/EarTraining.jsx'))

const PRIVACY_URL = 'https://joeyf116.github.io/music/privacy.html'

const PAGES = [
  {
    id: 'fretboard',
    label: 'Fretboard',
    icon: <path d="M4 6h16M4 10h16M4 14h16M4 18h16M8 4v16M14 4v16" />,
  },
  {
    id: 'drums',
    label: 'Drums',
    icon: <path d="M4 10c0-1.7 3.6-3 8-3s8 1.3 8 3v6c0 1.7-3.6 3-8 3s-8-1.3-8-3Zm0 0c0 1.7 3.6 3 8 3s8-1.3 8-3M8 13v5.5M16 13v5.5M7 3l5 6.5M17 3l-5 6.5" />,
  },
  {
    id: 'quiz',
    label: 'Training',
    icon: <path d="M6 9a6 6 0 1 1 12 0c0 3-2 4-3 5.5S14 18 12 19.5 8.5 20 8 18M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-1.5 3.5" />,
  },
  {
    id: 'community',
    label: 'Community',
    icon: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5ZM8 9h8M8 12h5" />,
  },
]

// Account isn't one of the tabs: it opens from the button at the top right.
// Resources is the Community page's Links view; it keeps its own address so old links still work.
const PAGE_IDS = [...PAGES.map((p) => p.id), 'resources', 'account']
// The Rhythm page (#exercises) is gone; its metronome lives on the Drums page now. Charts (#charts) is gone too and falls back to the Fretboard.
const MOVED_PAGES = { exercises: 'drums' }

/** Top right of the header: "Log in", or the first letter of your name once you are. */
function AccountButton({ current }) {
  const auth = useAuth()
  if (auth.status === 'off') return null
  const signedIn = auth.status === 'signedIn'
  const name = signedIn ? displayName(auth.user, auth.profile) : ''
  return (
    <a
      className={`account-button${signedIn ? ' signed-in' : ''}`}
      href="#account"
      aria-current={current ? 'page' : undefined}
      aria-label={signedIn ? `Account: ${name}` : undefined}
      title={signedIn ? name : undefined}
    >
      {signedIn ? <span className="account-initial" aria-hidden="true">{initialOf(name)}</span> : 'Log in'}
    </a>
  )
}

export default function App() {
  const page = useHashPage(PAGE_IDS, 'fretboard', MOVED_PAGES)
  useSettingsSync()
  // One key and one scale/mode for the whole app: changing the key never changes the mode.
  const [key, setKey] = usePersistentState('music.key', 'A')
  const [scaleType, setScaleType] = usePersistentState('music.scale', 'minorPentatonic')
  const [tuningId, setTuningId] = usePersistentState('music.tuning', 'standard')

  const safeKey = KEYS.includes(key) ? key : 'C'
  const tuningSpec = TUNINGS[tuningId] ?? TUNINGS.standard
  const tuning = tuningSpec.pitches
  // Open strings follow the tuning's own spelling (Eb standard reads Eb, not D#), otherwise the key's.
  const stringName = (s) => pcName(tuning[s], tuningSpec.flats ?? usesFlats(safeKey))

  return (
    <PlayerProvider tuning={tuning} keyName={safeKey}>
    <div className="app">
      <header className="site-header">
        <a className="brand" href="#fretboard">
          <Logo />
          <span className="brand-name">
            Fretboard <span className="brand-accent">Practice</span>
          </span>
        </a>
        {/* Phones get this as a bottom tab bar (in thumb reach, never over the top of the page); wider screens show it inline. */}
        <nav className="page-nav" aria-label="Pages">
          {PAGES.map((p) => (
            <a key={p.id} href={`#${p.id}`} aria-current={page === p.id || (p.id === 'community' && page === 'resources') ? 'page' : undefined} onClick={() => page === p.id && window.scrollTo(0, 0)}>
              <svg className="page-icon" viewBox="0 0 24 24" aria-hidden="true">
                {p.icon}
              </svg>
              <span className={p.short ? 'nav-long' : undefined}>{p.label}</span>
              {p.short && <span className="nav-short">{p.short}</span>}
            </a>
          ))}
        </nav>
        <AccountButton current={page === 'account'} />
      </header>

      <main>
        <Suspense fallback={<p className="page-loading" role="status">Loading…</p>}>
        {page === 'account' ? (
          <AccountPage />
        ) : page === 'community' || page === 'resources' ? (
          <CommunityPage view={page === 'resources' ? 'links' : 'posts'} />
        ) : page === 'drums' ? (
          <DrumsPage />
        ) : page === 'quiz' ? (
          <EarTraining tuning={tuning} tuningId={tuningId} onTuningChange={setTuningId} stringName={stringName} keyName={safeKey} />
        ) : (
          <FretboardPage
            keyName={safeKey}
            onKeyChange={setKey}
            scaleType={scaleType}
            onScaleChange={setScaleType}
            tuning={tuning}
            tuningSpec={tuningSpec}
            tuningId={tuningId}
            onTuningChange={setTuningId}
          />
        )}
        </Suspense>
      </main>

      <NowPlaying page={page} />

      <footer className="site-footer">
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          Privacy
        </a>
      </footer>
    </div>
    </PlayerProvider>
  )
}
