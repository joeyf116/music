import usePersistentState from '../lib/usePersistentState.js'
import ChordQuiz from './ChordQuiz.jsx'
import IntervalQuiz from './IntervalQuiz.jsx'
import PageTabs from './PageTabs.jsx'
import './Rhythm.css'

const TABS = [
  { id: 'chords', label: 'Chords', hint: 'Major, minor, dim…' },
  { id: 'intervals', label: 'Intervals', hint: 'Distance between notes' },
]

/** Ear training: name chord qualities and intervals by ear. */
export default function EarTraining({ tuning, tuningId, onTuningChange, stringName, keyName }) {
  const [tab, setTab] = usePersistentState('music.earTab', 'chords')
  const current = TABS.some((t) => t.id === tab) ? tab : 'chords'
  return (
    <section className="panel ear-training">
      <div className="section-head">
        <h2>Ear training</h2>
      </div>
      <PageTabs label="Ear training" tabs={TABS} value={current} onChange={setTab}>
        {current === 'chords' ? (
          <ChordQuiz tuning={tuning} stringName={stringName} keyName={keyName} />
        ) : (
          <IntervalQuiz tuning={tuning} tuningId={tuningId} onTuningChange={onTuningChange} stringName={stringName} />
        )}
      </PageTabs>
      <p className="hint ear-tip">Short and often works best: ten minutes a day trains your ear faster than an hour once a week. Sing or hum the notes back when you can.</p>
    </section>
  )
}
