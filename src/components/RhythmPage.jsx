import { DEFAULT_SOUND, SOUND_KEY, soundById } from '../lib/clickSounds.js'
import { fitAccents } from '../lib/rhythm.js'
import { SCALES } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import Exercises from './Exercises.jsx'
import Metronome from './Metronome.jsx'
import PageTabs from './PageTabs.jsx'
import RhythmDrills from './RhythmDrills.jsx'
import TimingTest from './TimingTest.jsx'
import './Rhythm.css'
import { PageHeader } from './layout.jsx'

export const RHYTHM_TAB_KEY = 'music.rhythmTab'
const TABS = [
  { id: 'metronome', label: 'Metronome' },
  { id: 'rhythms', label: 'Rhythms' },
  { id: 'timing', label: 'Timing' },
  { id: 'drills', label: 'Drills' },
]
const ABOUT = {
  metronome: 'Set a tempo, choose how the beat is split and what it sounds like. Gap click and the speed trainer build your inner clock.',
  rhythms: 'Strumming rhythms from simple to tricky, shown as counts, strum arrows and tab. Listen, count, then play along.',
  // The Timing tab explains itself in its own first line.
  drills: 'Scale, arpeggio and chord drills in tab that play in time with the click.',
}

const DEFAULT_METRONOME = {
  bpm: 90,
  meter: '4/4',
  accents: null,
  subdivision: 'beats',
  volume: 0.8,
  subVolume: 0.6,
  countIn: false,
  gap: { on: false, play: 2, mute: 2 },
  speed: { on: false, step: 2, every: 4, max: 160 },
  tapCorrection: 0,
}

/** The rhythm trainer: metronome, strumming rhythms, a timing test and the fretboard drills, one tab each. */
export default function RhythmPage(props) {
  const { tuning, stringName, keyName, scaleType } = props
  const [tab, setTab] = usePersistentState(RHYTHM_TAB_KEY, 'metronome')
  const [stored, setStored] = usePersistentState('music.metronome', DEFAULT_METRONOME)
  const [sound, setSound] = usePersistentState(SOUND_KEY, DEFAULT_SOUND)
  const settings = { ...DEFAULT_METRONOME, ...stored, gap: { ...DEFAULT_METRONOME.gap, ...stored?.gap }, speed: { ...DEFAULT_METRONOME.speed, ...stored?.speed } }
  settings.accents = fitAccents(settings.accents, settings.meter)
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
