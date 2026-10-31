import { TRAINING_TABS, TRAINING_TIPS, type TrainingTab } from '@music/theoryDrill.js'
import Page from '@/components/Page'
import ChordQuiz from '@/components/training/ChordQuiz'
import IntervalQuiz from '@/components/training/IntervalQuiz'
import TheoryDrill from '@/components/training/TheoryDrill'
import { Hint, Segmented } from '@/components/ui'
import { useMusic } from '@/lib/music'
import { useStored } from '@/lib/prefs'

const TAB_OPTIONS = TRAINING_TABS.map((t) => ({ value: t.id, label: t.label }))

/** Training, as on the web (src/components/EarTraining.jsx): name chords and intervals by ear, and build the chords of any key. */
export default function TrainingScreen() {
  const { tuning, stringName, keyName } = useMusic()
  const [tab, setTab] = useStored<TrainingTab>('music.earTab', 'chords')
  const current = TRAINING_TABS.some((t) => t.id === tab) ? tab : 'chords'
  return (
    <Page summary="Name chords and intervals by ear, and learn to build the chords of any key.">
      <Segmented options={TAB_OPTIONS} value={current} onChange={setTab} />
      {current === 'chords' && <ChordQuiz tuning={tuning} stringName={stringName} keyName={keyName} />}
      {current === 'intervals' && <IntervalQuiz />}
      {current === 'theory' && <TheoryDrill keyName={keyName} />}
      <Hint>{current === 'theory' ? TRAINING_TIPS.theory : TRAINING_TIPS.ear}</Hint>
    </Page>
  )
}
