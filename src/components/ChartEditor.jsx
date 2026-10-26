import { useState } from 'react'
import { STYLE_IDS, STYLES } from '../lib/arranger.js'
import { ALL_KEYS, badTokens, CHART_LIMITS, TIME_SIGNATURES, validateChart } from '../lib/chart.js'
import ChartPlayer from './ChartPlayer.jsx'
import { Choice, Field, Stepper } from './controls.jsx'

const NEXT_LABEL = { A: 'B', B: 'C', C: 'D', Verse: 'Chorus', Chorus: 'Bridge', Intro: 'A' }

/** Form for writing a chart: details, then sections of bar boxes, with the band underneath to try it out. */
export default function ChartEditor({ initial, canShare, sharedAlready, onSave, onCancel }) {
  const [draft, setDraft] = useState(initial)
  const [share, setShare] = useState(canShare && (sharedAlready ?? true))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setSections = (fn) => setDraft((d) => ({ ...d, sections: fn(d.sections) }))
  const setSection = (s, patch) => setSections((all) => all.map((sec, i) => (i === s ? { ...sec, ...patch } : sec)))
  const setBars = (s, fn) => setSections((all) => all.map((sec, i) => (i === s ? { ...sec, bars: fn(sec.bars) } : sec)))
  const move = (s, by) =>
    setSections((all) => {
      const next = [...all]
      const [sec] = next.splice(s, 1)
      next.splice(Math.max(0, Math.min(all.length - 1, s + by)), 0, sec)
      return next
    })

  // Typing or pasting "C | Am | F G |" into a box spreads it over that bar and the ones after it.
  const editBar = (s, b, value) => {
    if (!value.includes('|')) return setBars(s, (bars) => bars.map((t, i) => (i === b ? value : t)))
    const pieces = value.split('|').map((t) => t.trim())
    while (pieces.length > 1 && pieces.at(-1) === '') pieces.pop()
    if (pieces[0] === '' && pieces.length > 1) pieces.shift()
    setBars(s, (bars) => {
      const next = [...bars]
      next.splice(b, Math.min(pieces.length, bars.length - b), ...pieces)
      return next.slice(0, CHART_LIMITS.barsPerSection)
    })
  }

  const totalBars = draft.sections.reduce((n, s) => n + s.bars.length, 0)
  const preview = { ...draft, tempo: Number(draft.tempo) || 120, sections: draft.sections.filter((s) => s.bars.length) }

  const save = async (e) => {
    e.preventDefault()
    const { chart, error: problem } = validateChart(draft, STYLES)
    if (problem) return setError(problem)
    setError('')
    setSaving(true)
    try {
      await onSave(chart, share)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="chart-editor" onSubmit={save}>
      <div className="editor-fields">
        <Field label="Title" className="wide">
          <input value={draft.title} maxLength={CHART_LIMITS.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Blues for practice" required />
        </Field>
        <Field label="Composer" hint="optional" className="wide">
          <input value={draft.composer} maxLength={CHART_LIMITS.composer} onChange={(e) => set({ composer: e.target.value })} />
        </Field>
        <Field label="Style">
          <select value={draft.style} onChange={(e) => set({ style: e.target.value, tempo: STYLES[e.target.value].tempo })}>
            {STYLE_IDS.map((id) => (
              <option key={id} value={id}>
                {STYLES[id].name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Key">
          <select value={draft.key} onChange={(e) => set({ key: e.target.value })}>
            <optgroup label="Major">
              {ALL_KEYS.filter((k) => !k.endsWith('m')).map((k) => (
                <option key={k} value={k}>
                  {k} major
                </option>
              ))}
            </optgroup>
            <optgroup label="Minor">
              {ALL_KEYS.filter((k) => k.endsWith('m')).map((k) => (
                <option key={k} value={k}>
                  {k.slice(0, -1)} minor
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <Choice label="Time" options={TIME_SIGNATURES} value={draft.time} onChange={(time) => set({ time })} size="small" />
        <Stepper label="Tempo (BPM)" value={draft.tempo} onChange={(tempo) => set({ tempo })} min={40} max={300} step={5} fallback={120} />
      </div>

      <details className="chart-help">
        <summary>How to write bars</summary>
        <ul>
          <li>
            One box is one bar. Put several chords in a box to split the bar: <code>Dm7 G7</code> is two beats each.
          </li>
          <li>
            <code>/</code> holds the chord for another beat (<code>C / / G7</code> is three beats of C, one of G7). <code>%</code> repeats the bar before, an empty box keeps the last chord going and <code>NC</code> is a break.
          </li>
          <li>
            Chords like <code>C</code>, <code>Am</code>, <code>F#m7b5</code>, <code>Bbmaj7</code>, <code>G7#9</code>, <code>Eb13</code>, <code>Dsus4</code>, <code>C/E</code> all work (also <code>-7</code>, <code>^7</code>, <code>ø</code>, <code>o7</code>).
          </li>
          <li>
            Paste a whole line like <code>| C | Am | F G | C |</code> into a box to fill several bars at once.
          </li>
        </ul>
      </details>

      {draft.sections.map((section, s) => (
        <fieldset className="editor-section" key={s}>
          <legend className="visually-hidden">Section {s + 1}</legend>
          <div className="editor-section-head">
            <Field label="Section">
              <input className="section-label" value={section.label} maxLength={CHART_LIMITS.label} onChange={(e) => setSection(s, { label: e.target.value })} placeholder="A" />
            </Field>
            <span className="resource-count">{section.bars.length} bars</span>
            <span className="editor-section-actions">
              <button type="button" className="icon-button" onClick={() => move(s, -1)} disabled={s === 0} aria-label="Move section up">
                ↑
              </button>
              <button type="button" className="icon-button" onClick={() => move(s, 1)} disabled={s === draft.sections.length - 1} aria-label="Move section down">
                ↓
              </button>
              <button type="button" onClick={() => setSections((all) => [...all.slice(0, s + 1), { ...section, bars: [...section.bars] }, ...all.slice(s + 1)])} disabled={draft.sections.length >= CHART_LIMITS.sections}>
                Duplicate
              </button>
              <button type="button" onClick={() => setSections((all) => all.filter((_, i) => i !== s))} disabled={draft.sections.length === 1}>
                Delete
              </button>
            </span>
          </div>
          <div className="editor-bars">
            {section.bars.map((bar, b) => {
              const bad = badTokens(bar)
              return (
                <input
                  key={b}
                  className={`bar-input${bad.length ? ' invalid' : ''}`}
                  value={bar}
                  maxLength={200}
                  onChange={(e) => editBar(s, b, e.target.value)}
                  aria-label={`${section.label || `Section ${s + 1}`} bar ${b + 1}`}
                  aria-invalid={bad.length > 0}
                  title={bad.length ? `Can't read ${bad.join(', ')}` : undefined}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              )
            })}
          </div>
          <div className="editor-bar-actions">
            <button type="button" onClick={() => setBars(s, (bars) => [...bars, ''])} disabled={section.bars.length >= CHART_LIMITS.barsPerSection || totalBars >= CHART_LIMITS.totalBars}>
              + Bar
            </button>
            <button type="button" onClick={() => setBars(s, (bars) => [...bars, '', '', '', ''].slice(0, CHART_LIMITS.barsPerSection))} disabled={section.bars.length >= CHART_LIMITS.barsPerSection || totalBars >= CHART_LIMITS.totalBars}>
              + 4 bars
            </button>
            <button type="button" onClick={() => setBars(s, (bars) => bars.slice(0, -1))} disabled={section.bars.length <= 1}>
              − Bar
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() => setSections((all) => [...all, { label: NEXT_LABEL[all.at(-1)?.label] ?? '', bars: Array(8).fill('') }])}
        disabled={draft.sections.length >= CHART_LIMITS.sections}
      >
        + Add section
      </button>

      <div className="editor-save">
        {canShare && (
          <label className="check">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} disabled={sharedAlready} />
            {sharedAlready ? 'Shared in the public catalog' : 'Share in the public catalog so everyone can play it'}
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="add-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save chart'}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>

      <h3 className="editor-preview-head">Try it with the band</h3>
      {preview.sections.length > 0 && <ChartPlayer chart={preview} keyboard={false} />}
    </form>
  )
}
