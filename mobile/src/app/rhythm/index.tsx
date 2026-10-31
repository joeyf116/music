import { View } from 'react-native'
import { DEFAULT_SOUND, SOUND_KEY } from '@music/clickSounds.js'
import { DEFAULT_METRONOME, METRONOME_KEY, RHYTHM_ABOUT, RHYTHM_TABS, RHYTHM_TAB_KEY, metronomeSettings, type RhythmTab } from '@music/rhythmView.js'
import { SCALES } from '@music/theory.js'
import Page from '@/components/Page'
import Drills from '@/components/rhythm/Drills'
import Metronome, { type MetronomePatch } from '@/components/rhythm/Metronome'
import RhythmDrills from '@/components/rhythm/RhythmDrills'
import TimingTest from '@/components/rhythm/TimingTest'
import { Hint, Segmented } from '@/components/ui'
import { useMusic } from '@/lib/music'
import { useStored } from '@/lib/prefs'

const TAB_OPTIONS = RHYTHM_TABS.map((t) => ({ value: t.id, label: t.label }))

/** The rhythm trainer, as on the web (src/components/RhythmPage.jsx): metronome, strumming rhythms, timing test, drills. */
export default function RhythmScreen() {
  const { tuning, stringName, keyName, scaleType } = useMusic()
  const [tab, setTab] = useStored<RhythmTab>(RHYTHM_TAB_KEY, 'metronome')
  const [stored, setStored] = useStored<MetronomePatch>(METRONOME_KEY, DEFAULT_METRONOME)
  const [sound, setSound] = useStored(SOUND_KEY, DEFAULT_SOUND)
  const settings = metronomeSettings(stored)
  const update = (patch: MetronomePatch) => setStored((s) => ({ ...DEFAULT_METRONOME, ...s, ...patch }))
  const current = RHYTHM_TABS.some((t) => t.id === tab) ? tab : 'metronome'
  const intervals = (SCALES[scaleType] ?? SCALES.major).intervals
  const minor = intervals.includes(3) && !intervals.includes(4)
  const about = RHYTHM_ABOUT[current]

  return (
    <Page summary="Lock in your timing: a metronome, strumming rhythms, a timing test and drills in tab.">
      <View>
        <Segmented options={TAB_OPTIONS} value={current} onChange={setTab} />
      </View>
      {about ? <Hint>{about}</Hint> : null}
      {current === 'metronome' && <Metronome settings={settings} update={update} sound={sound} onSoundChange={setSound} />}
      {current === 'rhythms' && <RhythmDrills tuning={tuning} stringName={stringName} keyName={keyName} minor={minor} settings={settings} update={update} />}
      {current === 'timing' && <TimingTest settings={settings} update={update} sound={sound} />}
      {current === 'drills' && <Drills />}
    </Page>
  )
}
