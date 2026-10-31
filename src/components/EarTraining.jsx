import usePersistentState from '../lib/usePersistentState.js'
import ChordQuiz from './ChordQuiz.jsx'
import IntervalQuiz from './IntervalQuiz.jsx'
import PageTabs from './PageTabs.jsx'
import TheoryDrill from './TheoryDrill.jsx'
import './Rhythm.css'
import { PageHeader } from './layout.jsx'

const TABS = [
  { id: 'chords', label: 'Chords', hint: 'By ear' },
  { id: 'intervals', label: 'Intervals', hint: 'By ear' },
  { id: 'theory', label: 'Theory', hint: 'Keys & chords' },
]

/** Training: name chord qualities and intervals by ear, and build the chords of any key. */
export default function EarTraining({ tuning, tuningId, onTuningChange, stringName, keyName }) {
  const [tab, setTab] = usePersistentState('music.earTab', 'chords')
  const current = TABS.some((t) => t.id === tab) ? tab : 'chords'
  return (
    <section className="page ear-training">
      <PageHeader title="Training" summary="Name chords and intervals by ear, and learn to build the chords of any key." />
      <PageTabs label="Training" tabs={TABS} value={current} onChange={setTab}>
        {current === 'theory' ? (
          <TheoryDrill keyName={keyName} />
        ) : current === 'chords' ? (
          <ChordQuiz tuning={tuning} stringName={stringName} keyName={keyName} />
        ) : (
          <IntervalQuiz tuning={tuning} tuningId={tuningId} onTuningChange={onTuningChange} stringName={stringName} />
        )}
      </PageTabs>
      <p className="hint ear-tip">
        {current === 'theory'
          ? 'Short and often works best: a few minutes a day until I ii iii IV V vi vii° comes without thinking.'
          : 'Short and often works best: ten minutes a day trains your ear faster than an hour once a week. Sing or hum the notes back when you can.'}
      </p>
    </section>
  )
}
