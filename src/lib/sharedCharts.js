// Charts any visitor can share, stored in a Supabase table (see supabase/charts.sql).
// Same project and plain-fetch approach as the shared resources.
import { sharedConfig } from './sharedResources.js'

const headers = (config) => ({ apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' })

const failure = async (res, fallback) => {
  const body = await res.json().catch(() => ({}))
  if (body.message?.includes('slow down')) return new Error('Lots of charts were just shared. Try again in a few minutes.')
  if (body.code === '42P01' || body.code === 'PGRST205' || body.code === 'PGRST202') return new Error('Shared charts aren’t set up yet.')
  return new Error(`${fallback} (${res.status}). Try again later.`)
}

// The database calls the time signature `time_signature`; the app calls it `time`.
const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  composer: row.composer,
  style: row.style,
  key: row.key,
  time: row.time_signature,
  tempo: row.tempo,
  sections: row.sections,
  created_at: row.created_at,
  updated_at: row.updated_at,
})
const toArgs = (chart) => ({
  title: chart.title,
  composer: chart.composer,
  style: chart.style,
  key: chart.key,
  time_signature: chart.time,
  tempo: chart.tempo,
  sections: chart.sections,
})

export async function fetchSharedCharts(config = sharedConfig, fetchImpl = fetch) {
  const res = await fetchImpl(
    `${config.url}/rest/v1/charts?select=id,title,composer,style,key,time_signature,tempo,sections,created_at,updated_at&order=title.asc`,
    { headers: headers(config) },
  )
  if (!res.ok) throw await failure(res, "Couldn't load shared charts")
  return (await res.json()).map(fromRow)
}

const rpc = async (name, args, config, fetchImpl, fallback) => {
  const res = await fetchImpl(`${config.url}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(config), body: JSON.stringify(args) })
  if (!res.ok) throw await failure(res, fallback)
  return res.json()
}

/** Shares a chart with everyone; resolves to the chart including its new id. */
export async function addSharedChart(chart, ownerToken, config = sharedConfig, fetchImpl = fetch) {
  const id = await rpc('add_chart', { ...toArgs(chart), token: ownerToken }, config, fetchImpl, "Couldn't share the chart")
  const now = new Date().toISOString()
  return { ...chart, id, created_at: now, updated_at: now }
}

/** Saves changes to a chart this browser shared. Resolves to false if the token doesn't match. */
export const updateSharedChart = (id, chart, ownerToken, config = sharedConfig, fetchImpl = fetch) =>
  rpc('update_chart', { chart_id: id, token: ownerToken, ...toArgs(chart) }, config, fetchImpl, "Couldn't save the chart")

/** Removes a chart this browser shared. Resolves to false if the token doesn't match. */
export const removeSharedChart = (id, ownerToken, config = sharedConfig, fetchImpl = fetch) =>
  rpc('remove_chart', { chart_id: id, token: ownerToken }, config, fetchImpl, "Couldn't remove the chart")

/** Flags a chart as spam or wrong; it's hidden automatically after a few reports. */
export const reportSharedChart = (id, reason, config = sharedConfig, fetchImpl = fetch) =>
  rpc('report_chart', { chart_id: id, reason }, config, fetchImpl, "Couldn't send the report")
