import { usePracticeLog } from '../lib/practiceLog.js'

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
const LONG_DAY = new Intl.DateTimeFormat(undefined, { weekday: 'long' })

/**
 * The last seven days as dots, lit on days you played anything. A quiet nudge to come back tomorrow:
 * no score to lose, a missed day is just an unlit dot.
 */
export default function PracticeWeek() {
  const { week, count, streak, today } = usePracticeLog()
  const message = count === 0 ? 'Play any note to start your week' : streak > 1 ? `${streak}-day run` : `${count} of 7 days`
  const label = `Practised ${count} of the last 7 days${streak > 1 ? `, ${streak} days in a row` : ''}${today ? ', including today' : ''}`
  return (
    <div className="practice-week" role="img" aria-label={label} title={label}>
      <ol aria-hidden="true">
        {week.map((d, i) => (
          <li key={d.day} className={`${d.practiced ? 'done' : ''}${i === week.length - 1 ? ' today' : ''}`.trim()} title={`${LONG_DAY.format(d.date)}${d.practiced ? ': practised' : ''}`}>
            <span className="day-dot" />
            <span className="day-name">{WEEKDAY.format(d.date)}</span>
          </li>
        ))}
      </ol>
      <span className="practice-week-text" aria-hidden="true">
        {message}
      </span>
    </div>
  )
}
