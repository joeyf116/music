// Every chart the app knows: built-in ones, the shared catalog (when sharing is set up) and the player's own,
// saved on the device under the same keys as the web site. Screens share one copy through useCharts().
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { STYLES } from '@music/arranger.js'
import type { Chart } from '@music/chart.js'
import { SHARE_COOLDOWN_MS, catalogCharts, type CatalogChart, type LocalChart, type SharedChartRow } from '@music/chartView.js'
import { addSharedChart, fetchSharedCharts, removeSharedChart, reportSharedChart, updateSharedChart } from '@music/sharedCharts.js'
import { useStored } from './prefs'
import { CAN_SHARE, SHARED, newToken } from './sharing'

export type SharedStatus = 'off' | 'loading' | 'ok' | 'error'

// The shared catalog, fetched once per app run and kept for every screen.
let rows: SharedChartRow[] = []
let status: SharedStatus = CAN_SHARE ? 'loading' : 'off'
let started = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const setRows = (next: SharedChartRow[], nextStatus: SharedStatus = status) => {
  rows = next
  status = nextStatus
  notify()
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export interface Charts {
  all: CatalogChart[]
  local: LocalChart[]
  shared: SharedChartRow[]
  mine: Record<string, string>
  status: SharedStatus
  find: (id: string | undefined) => CatalogChart | null
  /** Saves a chart (new, or over `target`), shared when asked and possible. Resolves to its catalog id. */
  save: (chart: Chart, target: CatalogChart | null, share: boolean) => Promise<string>
  remove: (chart: CatalogChart) => Promise<void>
  report: (chart: CatalogChart, reason: string) => Promise<void>
}

export function useCharts(): Charts {
  const [local, setLocal] = useStored<LocalChart[]>('music.myCharts', [])
  const [mine, setMine] = useStored<Record<string, string>>('music.mySharedCharts', {})
  const [lastShared, setLastShared] = useStored('music.lastChartSharedAt', 0)
  const shared = useSyncExternalStore(subscribe, () => rows)
  const sharedStatus = useSyncExternalStore(subscribe, () => status)

  useEffect(() => {
    if (!CAN_SHARE || started) return
    started = true
    fetchSharedCharts(SHARED)
      .then((r) => setRows(r, 'ok'))
      .catch(() => setRows(rows, 'error'))
  }, [])

  const all = useMemo(() => catalogCharts(shared, local, mine), [shared, local, mine])
  const find = useCallback((id: string | undefined) => all.find((c) => c.id === id) ?? null, [all])

  const save = async (chart: Chart, target: CatalogChart | null, share: boolean): Promise<string> => {
    if (target?.source === 'shared' && target.sharedId) {
      const ok = await updateSharedChart(target.sharedId, chart, mine[target.sharedId], SHARED)
      if (!ok) throw new Error('This device can no longer edit that chart.')
      setRows(rows.map((r) => (r.id === target.sharedId ? { ...r, ...chart } : r)))
      return target.id
    }
    if (share && CAN_SHARE) {
      const wait = lastShared + SHARE_COOLDOWN_MS - Date.now()
      if (wait > 0) throw new Error(`You just shared a chart. Try again in ${Math.ceil(wait / 1000)} seconds, or turn sharing off to save it just for you.`)
      const token = newToken()
      const row = await addSharedChart(chart, token, SHARED)
      setLastShared(Date.now())
      setMine({ ...mine, [row.id]: token })
      setRows([...rows, row], 'ok')
      if (target?.source === 'local') setLocal(local.filter((c) => c.id !== target.id))
      return `shared:${row.id}`
    }
    if (target?.source === 'local') {
      setLocal(local.map((c) => (c.id === target.id ? { ...c, ...chart } : c)))
      return target.id
    }
    const id = `local:${newToken()}`
    setLocal([...local, { ...chart, id }])
    return id
  }

  const remove = async (chart: CatalogChart) => {
    if (chart.source === 'local') {
      setLocal(local.filter((c) => c.id !== chart.id))
      return
    }
    if (!chart.sharedId) return
    if (!(await removeSharedChart(chart.sharedId, mine[chart.sharedId], SHARED))) throw new Error('This device can no longer remove that chart.')
    setRows(rows.filter((r) => r.id !== chart.sharedId))
    const rest = { ...mine }
    delete rest[chart.sharedId]
    setMine(rest)
  }

  const report = async (chart: CatalogChart, reason: string) => {
    if (chart.sharedId) await reportSharedChart(chart.sharedId, reason, SHARED)
  }

  return { all, local, shared, mine, status: sharedStatus, find, save, remove, report }
}

export const styleName = (id: string) => STYLES[id]?.name ?? id
