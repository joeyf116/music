import { useEffect, useMemo, useState } from 'react'
import { STYLE_IDS, STYLES } from '../lib/arranger.js'
import { blankChart } from '../lib/chart.js'
import { ALL_SHELF, SHARE_COOLDOWN_MS, barCount, catalogCharts, chartCountText, chartShelves, REPORT_REASONS, chartSummary, editableChart as editable, filterCharts, keyLabel } from '../lib/chartView.js'
import { addSharedChart, fetchSharedCharts, removeSharedChart, reportSharedChart, updateSharedChart } from '../lib/sharedCharts.js'
import { newOwnerToken, sharingEnabled } from '../lib/sharedResources.js'
import usePersistentState from '../lib/usePersistentState.js'
import ChartEditor from './ChartEditor.jsx'
import ChartPlayer from './ChartPlayer.jsx'
import './Charts.css'
import { PageHeader } from './layout.jsx'
import Menu from './Menu.jsx'

const CAN_SHARE = sharingEnabled()
const COOLDOWN_MS = SHARE_COOLDOWN_MS
const ALL = ALL_SHELF

/** iReal Pro-style charts: a catalog to browse, a player with a backing band, and an editor to write new ones. */
export default function Charts({ tuning, tuningId, onTuningChange }) {
  // Charts saved only in this browser, and tokens for the shared charts this browser created ({ [id]: token }).
  const [local, setLocal] = usePersistentState('music.myCharts', [])
  const [mine, setMine] = usePersistentState('music.mySharedCharts', {})
  const [lastShared, setLastShared] = usePersistentState('music.lastChartSharedAt', 0)
  const [openId, setOpenId] = usePersistentState('music.openChart', null)
  const [collection, setCollection] = usePersistentState('music.chartCollection', ALL)
  const [shared, setShared] = useState([])
  const [sharedStatus, setSharedStatus] = useState(CAN_SHARE ? 'loading' : 'off')
  const [query, setQuery] = useState('')
  const [style, setStyle] = useState('')
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!CAN_SHARE) return
    let live = true
    fetchSharedCharts()
      .then((rows) => live && (setShared(rows), setSharedStatus('ok')))
      .catch(() => live && setSharedStatus('error'))
    return () => {
      live = false
    }
  }, [])

  const all = useMemo(() => catalogCharts(shared, local, mine), [shared, local, mine])
  const open = all.find((c) => c.id === openId) ?? null

  const collections = chartShelves(shared, local, mine)
  const visible = filterCharts(all, { collection, style, query })

  const show = (id) => {
    setEditing(null)
    setOpenId(id)
    window.scrollTo(0, 0)
  }

  const save = async (chart, share) => {
    const target = editing.target
    if (target?.source === 'shared') {
      const ok = await updateSharedChart(target.sharedId, chart, mine[target.sharedId])
      if (!ok) throw new Error('This browser can no longer edit that chart.')
      setShared((rows) => rows.map((r) => (r.id === target.sharedId ? { ...r, ...chart } : r)))
      return show(target.id)
    }
    if (share && CAN_SHARE) {
      const wait = lastShared + COOLDOWN_MS - Date.now()
      if (wait > 0) throw new Error(`You just shared a chart. Try again in ${Math.ceil(wait / 1000)} seconds, or untick sharing to save it just for you.`)
      const token = newOwnerToken()
      const row = await addSharedChart(chart, token)
      setLastShared(Date.now())
      setMine({ ...mine, [row.id]: token })
      setShared((rows) => [...rows, row])
      if (target?.source === 'local') setLocal(local.filter((c) => c.id !== target.id))
      setSharedStatus('ok')
      return show(`shared:${row.id}`)
    }
    if (target?.source === 'local') {
      setLocal(local.map((c) => (c.id === target.id ? { ...c, ...chart } : c)))
      return show(target.id)
    }
    const id = `local:${newOwnerToken()}`
    setLocal([...local, { ...chart, id }])
    show(id)
  }

  const remove = async (chart) => {
    if (!window.confirm(chart.source === 'shared' ? `Remove "${chart.title}" for everyone?` : `Delete "${chart.title}"?`)) return
    if (chart.source === 'local') setLocal(local.filter((c) => c.id !== chart.id))
    else {
      try {
        if (!(await removeSharedChart(chart.sharedId, mine[chart.sharedId]))) throw new Error('This browser can no longer remove that chart.')
        setShared((rows) => rows.filter((r) => r.id !== chart.sharedId))
        const { [chart.sharedId]: _gone, ...rest } = mine
        setMine(rest)
      } catch (err) {
        return setNotice(err.message)
      }
    }
    setOpenId(null)
  }

  const report = async (chart, reason) => {
    try {
      await reportSharedChart(chart.sharedId, reason)
      setNotice('Thanks, the chart was reported.')
    } catch (err) {
      setNotice(err.message)
    }
  }

  if (editing) {
    return (
      <section className="page charts-page">
        <PageHeader title={editing.target ? `Edit “${editing.target.title}”` : 'New chart'} summary="Type the chords bar by bar and hear the band play them as you go." />
        <ChartEditor
          key={editing.target?.id ?? 'new'}
          initial={editing.draft}
          canShare={CAN_SHARE && sharedStatus !== 'error'}
          sharedAlready={editing.target?.source === 'shared' ? true : undefined}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      </section>
    )
  }

  if (open) {
    return (
      <section className="page charts-page">
        <div className="chart-view-head">
          <button type="button" className="link-button back-link" onClick={() => setOpenId(null)}>
            ← All charts
          </button>
          <div className="chart-title">
            <h1>{open.title}</h1>
            <p className="page-summary">
              {chartSummary(open)}
            </p>
          </div>
          {/* One visible action (edit your own chart, or copy someone else's); the rest wait in the ⋯ menu. */}
          <div className="chart-actions">
            {open.mine ? (
              <button type="button" onClick={() => setEditing({ target: open, draft: editable(open) })}>
                Edit
              </button>
            ) : (
              <button type="button" onClick={() => setEditing({ target: null, draft: editable(open) })}>
                Copy &amp; edit
              </button>
            )}
            {(open.mine || open.source === 'shared') && (
              <Menu
                label="Chart actions"
                buttonClassName="icon-button"
                items={
                  open.mine
                    ? [
                        { label: 'Duplicate', onSelect: () => setEditing({ target: null, draft: { ...editable(open), title: `${open.title} (copy)` } }) },
                        { separator: true },
                        { label: open.source === 'shared' ? 'Remove for everyone' : 'Delete', destructive: true, onSelect: () => remove(open) },
                      ]
                    : [{ heading: 'Report this chart' }, ...REPORT_REASONS.map((reason) => ({ label: reason, onSelect: () => report(open, reason) }))]
                }
              />
            )}
          </div>
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <ChartPlayer key={open.id} chart={open} tuning={tuning} tuningId={tuningId} onTuningChange={onTuningChange} />
      </section>
    )
  }

  return (
    <section className="page charts-page">
      <PageHeader
        title="Charts"
        summary="Pick a song and play along with a drums, bass and piano band in any key and tempo."
        actions={
          <button type="button" className="primary" onClick={() => setEditing({ target: null, draft: blankChart() })}>
            + New chart
          </button>
        }
      />

      <div className="catalog-controls">
        <div className="search-row">
          <input className="catalog-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, composer or key" aria-label="Search charts" enterKeyHint="search" />
          <select className="sort-select" value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Style">
            <option value="">All styles</option>
            {STYLE_IDS.map((id) => (
              <option key={id} value={id}>
                {STYLES[id].name}
              </option>
            ))}
          </select>
        </div>
        <div className="type-chips" role="group" aria-label="Collection">
          {collections.map((c) => (
            <button key={c} type="button" className={`filter-chip${collection === c ? ' on' : ''}`} aria-pressed={collection === c} onClick={() => setCollection(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="results-count" aria-live="polite">
        {chartCountText(visible.length, all.length)}
      </p>

      {sharedStatus === 'error' && <p className="notice">Shared charts couldn’t be loaded right now, so only built-in charts and your own are shown.</p>}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      {visible.length ? (
        <ul className="chart-list">
          {visible.map((c) => (
            <li key={c.id}>
              <button type="button" className="chart-card" onClick={() => show(c.id)}>
                <span className="chart-card-title">{c.title}</span>
                <span className="chart-card-meta">{c.composer}</span>
                <span className="chart-card-tags">
                  <span className="chart-key">{keyLabel(c.key)}</span>
                  <span>{STYLES[c.style]?.name}</span>
                  <span>{c.time}</span>
                  <span>{barCount(c)} bars</span>
                  {c.source === 'shared' && <span className="badge badge-link">shared</span>}
                  {c.mine && <span className="badge badge-mine">{c.source === 'local' ? 'only you' : 'yours'}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">No charts match. Try another search or make a new one.</p>
      )}
    </section>
  )
}
