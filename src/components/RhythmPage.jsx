import { DEFAULT_SOUND, SOUND_KEY, soundById } from '../lib/clickSounds.js'
import { DEFAULT_METRONOME, METRONOME_KEY, RHYTHM_ABOUT as ABOUT, RHYTHM_TABS as TABS, RHYTHM_TAB_KEY, metronomeSettings } from '../lib/rhythmView.js'
import { SCALES } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import Exercises from './Exercises.jsx'
import Metronome from './Metronome.jsx'
import PageTabs from './PageTabs.jsx'
import RhythmDrills from './RhythmDrills.jsx'
import TimingTest from './TimingTest.jsx'
import './Rhythm.css'
import { PageHeader } from './layout.jsx'

/** The rhythm trainer: metronome, strumming rhythms, a timing test and the fretboard drills, one tab each. */
export default function RhythmPage(props) {
  const { tuning, stringName, keyName, scaleType } = props
  const [tab, setTab] = usePersistentState(RHYTHM_TAB_KEY, 'metronome')
  const [stored, setStored] = usePersistentState(METRONOME_KEY, DEFAULT_METRONOME)
  const [sound, setSound] = usePersistentState(SOUND_KEY, DEFAULT_SOUND)
  const settings = metronomeSettings(stored)
  const update = (patch) => setStored((s) => ({ ...DEFAULT_METRONOME, ...s, ...patch }))
  const current = TABS.some((t) => t.id === tab) ? tab : 'metronome'
  const intervals = (SCALES[scaleType] ?? SCALES.major).intervals
  const minor = intervals.includes(3) && !intervals.includes(4)
  const soundId = soundById(sound).id

  return (
    <section className="page rhythm-page">
      <PageHeader title="Rhythm" summary="Lock in your timing: a metronome, strumming rhythms, a timing test and drills in tab." />
      <PageTabs label="Rhythm trainer" tabs={TABS} value={current} onChange={setTab}>
        {ABOUT[current] && <p className="tab-about">{ABOUT[current]}</p>}
        {current === 'metronome' && <Metronome settings={settings} update={update} sound={soundId} onSoundChange={setSound} />}
        {current === 'rhythms' && <RhythmDrills tuning={tuning} stringName={stringName} keyName={keyName} minor={minor} settings={settings} update={update} />}
        {current === 'timing' && <TimingTest settings={settings} update={update} sound={soundId} />}
        {current === 'drills' && <Exercises {...props} />}
      </PageTabs>
    </section>
  )
}
