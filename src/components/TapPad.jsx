
/** The big pad you tap in time (pointer down, so there is no click delay), with the last tap's verdict. */
export default function TapPad({ judge, disabled, idle = 'Tap here in time', label = 'Tap pad' }) {
  const { last } = judge
  const tone = !last ? '' : last.miss ? 'off' : last.grade
  const text = !last ? idle : last.miss ? 'No beat near that tap' : `${last.label}${last.grade === 'perfect' ? '' : ` · ${last.ms > 0 ? '+' : ''}${last.ms} ms`}`
  return (
    <button
      type="button"
      className={`tap-pad ${tone}`}
      disabled={disabled}
      aria-label={label}
      // Judge on pointer down: waiting for "click" would add the release time to every tap.
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        judge.tap(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.repeat) {
          e.preventDefault()
          judge.tap(e)
        }
      }}
    >
      <span className="tap-pad-text" aria-live="polite">
        {text}
      </span>
      {last && !last.miss && <TapMeter ms={last.ms} />}
    </button>
  )
}

/** Where one tap landed: a dot on an early ← → late scale (±100 ms). */
function TapMeter({ ms }) {
  const x = 50 + Math.max(-100, Math.min(100, ms)) / 2
  return (
    <span className="tap-meter" aria-hidden="true">
      <span className="tap-meter-zone" />
      <span className="tap-meter-dot" style={{ left: `${x}%` }} />
      <span className="tap-meter-labels">
        <span>early</span>
        <span>late</span>
      </span>
    </span>
  )
}

/** Summary of a run of taps: every tap as a dot (early left, late right), plus averages in words. */
export function TapResults({ judge, onReset }) {
  const { results, summary } = judge
  if (!results.length) return null
  const judged = results.filter((r) => !r.miss)
  return (
    <div className="tap-results">
      <div className="tap-scatter" role="img" aria-label={summary ? summary.verdict : 'No taps landed near a beat yet'}>
        <span className="tap-scatter-center" />
        <span className="tap-scatter-zone" />
        {judged.map((r, i) => (
          <span key={i} className={`tap-scatter-dot ${r.grade}`} style={{ left: `${50 + Math.max(-100, Math.min(100, r.ms)) / 2}%`, opacity: 0.35 + (0.65 * (i + 1)) / judged.length }} />
        ))}
        <span className="tap-scatter-label left">← early</span>
        <span className="tap-scatter-label right">late →</span>
      </div>
      {summary && (
        <>
          <p className="tap-verdict">{summary.verdict}</p>
          <dl className="tap-stats">
            <div>
              <dt>Taps</dt>
              <dd>{summary.count}</dd>
            </div>
            <div>
              <dt>Within 25 ms</dt>
              <dd>{Math.round((summary.tight / summary.count) * 100)}%</dd>
            </div>
            <div>
              <dt>Average</dt>
              <dd>
                {summary.mean > 0 ? '+' : ''}
                {summary.mean} ms
              </dd>
            </div>
            <div>
              <dt>Spread</dt>
              <dd>±{summary.spread} ms</dd>
            </div>
          </dl>
        </>
      )}
      <button type="button" className="link-button" onClick={onReset}>
        Clear taps
      </button>
    </div>
  )
}
