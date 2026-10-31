import Charts from './components/Charts.jsx'
import Exercises from './components/Exercises.jsx'
import FretboardPage from './components/FretboardPage.jsx'
import Logo from './components/Logo.jsx'
import Quiz from './components/Quiz.jsx'
import Resources from './components/Resources.jsx'
import { KEYS, TUNINGS, pcName, usesFlats } from './lib/theory.js'
import useHashPage from './lib/useHashPage.js'
import usePersistentState from './lib/usePersistentState.js'
import './App.css'

const PAGES = [
  {
    id: 'fretboard',
    label: 'Fretboard',
    icon: <path d="M4 6h16M4 10h16M4 14h16M4 18h16M8 4v16M14 4v16" />,
  },
  {
    id: 'exercises',
    label: 'Exercises',
    icon: <path d="M9 3h6l3.5 18h-13ZM12 15l5-9M7.5 15h9" />,
  },
  {
    id: 'quiz',
    label: 'Quiz',
    icon: <path d="M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .9-1 1.6V14M12 17.5v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />,
  },
  {
    id: 'charts',
    label: 'Charts',
    icon: <path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9 9l11-2" />,
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" />,
  },
]

export default function App() {
  const page = useHashPage(PAGES.map((p) => p.id), 'fretboard')
  // One key and one scale/mode for the whole app: changing the key never changes the mode, and the
  // Exercises page picks up where the Fretboard left off (and back).
  const [key, setKey] = usePersistentState('music.key', 'A')
  const [scaleType, setScaleType] = usePersistentState('music.scale', 'minorPentatonic')
  const [tuningId, setTuningId] = usePersistentState('music.tuning', 'standard')
  const [bpm, setBpm] = usePersistentState('music.bpm', 100)

  const safeKey = KEYS.includes(key) ? key : 'C'
  const tuningSpec = TUNINGS[tuningId] ?? TUNINGS.standard
  const tuning = tuningSpec.pitches
  // Open strings follow the tuning's own spelling (Eb standard reads Eb, not D#), otherwise the key's.
  const stringName = (s) => pcName(tuning[s], tuningSpec.flats ?? usesFlats(safeKey))

  return (
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
            <a key={p.id} href={`#${p.id}`} aria-current={page === p.id ? 'page' : undefined} onClick={() => page === p.id && window.scrollTo(0, 0)}>
              <svg className="page-icon" viewBox="0 0 24 24" aria-hidden="true">
                {p.icon}
              </svg>
              <span>{p.label}</span>
            </a>
          ))}
        </nav>
      </header>

      <main>
        {page === 'resources' ? (
          <Resources />
        ) : page === 'exercises' ? (
          <Exercises
            tuning={tuning}
            tuningId={tuningId}
            onTuningChange={setTuningId}
            stringName={stringName}
            keyName={safeKey}
            onKeyChange={setKey}
            scaleType={scaleType}
            onScaleChange={setScaleType}
          />
        ) : page === 'charts' ? (
          <Charts tuning={tuning} tuningId={tuningId} onTuningChange={setTuningId} />
        ) : page === 'quiz' ? (
          <Quiz tuning={tuning} tuningId={tuningId} onTuningChange={setTuningId} stringName={stringName} />
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
            bpm={bpm}
            onBpmChange={setBpm}
          />
        )}
      </main>
    </div>
  )
}
