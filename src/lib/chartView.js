// The Charts page's catalog, sheet and editor logic, shared by the web page (components/Charts.jsx and friends) and
// the app, so both list, filter, draw and edit charts the same way.
import { STYLES } from './arranger.js'
import { CHART_LIMITS, chordParts } from './chart.js'
import { COLLECTIONS, LIBRARY } from './chartLibrary.js'

export const ALL_SHELF = 'All'
export const SHARED_SHELF = 'Shared'
export const MINE_SHELF = 'My charts'
export const SHARE_COOLDOWN_MS = 30_000

export const barCount = (chart) => chart.sections.reduce((n, s) => n + s.bars.length, 0)
export const keyLabel = (key) => (key.endsWith('m') ? `${key.slice(0, -1)} minor` : key)
/** The fields a chart is saved with (no ids or catalog details). */
export const editableChart = ({ title, composer, style, key, time, tempo, sections }) => ({ title, composer, style, key, time, tempo, sections })
/** "Composer · Swing · F · 4/4 · 140 bpm". */
export const chartSummary = (chart) => [chart.composer, STYLES[chart.style]?.name, keyLabel(chart.key), chart.time, `${chart.tempo} bpm`].filter(Boolean).join(' · ')

export const BUILT_IN_CHARTS = LIBRARY.map((c) => ({ ...c, id: `lib:${c.slug}`, source: 'library' }))

/** Every chart: built-in, shared (from the database) and saved on this device. `mine` maps shared ids to owner tokens. */
export const catalogCharts = (shared, local, mine) => [
  ...BUILT_IN_CHARTS,
  ...shared.map((c) => ({ ...c, sharedId: c.id, id: `shared:${c.id}`, source: 'shared', collection: c.collection || SHARED_SHELF, mine: Boolean(mine[c.id]) })),
  ...local.map((c) => ({ ...c, source: 'local', collection: MINE_SHELF, mine: true })),
]

/** Built-in shelves first, then any others the shared catalog uses (e.g. Folk & Country), then Shared and My charts. */
export const chartShelves = (shared, local, mine) => {
  const extra = [...new Set(shared.map((c) => c.collection).filter((c) => c && !COLLECTIONS.includes(c)))].sort()
  return [ALL_SHELF, ...COLLECTIONS, ...extra, ...(shared.some((c) => !c.collection) ? [SHARED_SHELF] : []), ...(local.length || Object.keys(mine).length ? [MINE_SHELF] : [])]
}

/** The charts on a shelf, in a style and matching every word of the search, A–Z. */
export const filterCharts = (all, { collection = ALL_SHELF, style = '', query = '' }) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return all
    .filter((c) => collection === ALL_SHELF || c.collection === collection || (collection === MINE_SHELF && c.mine))
    .filter((c) => !style || c.style === style)
    .filter((c) => words.every((w) => `${c.title} ${c.composer} ${c.key} ${STYLES[c.style]?.name}`.toLowerCase().includes(w)))
    .sort((a, b) => a.title.localeCompare(b.title))
}

export const chartCountText = (shown, total) => (shown === total ? `${total} charts` : `${shown} of ${total} charts`)

// ---- The sheet ----

export const BARS_PER_ROW = 4

/** What one bar shows: [{ kind: 'chord', root, quality, bass } | { kind: 'slash' } | { kind: 'nc' } | { kind: 'repeat' }]. */
export const barTokens = (text) => {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 1 && tokens[0] === '%') return [{ kind: 'repeat' }]
  return tokens.map((t) => (t === '/' || t === '-' ? { kind: 'slash' } : /^(n\.?c\.?|x)$/i.test(t) ? { kind: 'nc' } : { kind: 'chord', ...chordParts(t) }))
}

/** Number of the first bar in each section, counting through the whole chart. */
export const sectionStarts = (chart) => chart.sections.reduce((acc, section, s) => [...acc, s ? acc[s - 1] + chart.sections[s - 1].bars.length : 0], [])

/** "Transposed up 2 half steps from F." */
export const transposeText = (shift, fromKey) => `Transposed ${shift <= 6 ? `up ${shift}` : `down ${12 - shift}`} half step${shift === 1 || shift === 11 ? '' : 's'} from ${fromKey}.`

// ---- The band ----

export const CHANNEL_LABELS = { drums: 'Drums', bass: 'Bass', piano: 'Piano' }
export const DEFAULT_MIX = { drums: 0.8, bass: 0.9, piano: 0.7 }

/** Where the band is: count-in, bar N of M, or where it will start. */
export const bandStatus = ({ count, activeBar, startBar, totalBars }) =>
  count ? `Count ${count}` : activeBar !== null ? `Bar ${activeBar + 1} / ${totalBars}` : startBar > 0 ? `Start at bar ${startBar + 1}` : `${totalBars} bars`

// ---- The editor ----

const NEXT_LABEL = { A: 'B', B: 'C', C: 'D', Verse: 'Chorus', Chorus: 'Bridge', Intro: 'A' }

/** A new empty section after `sections`, named after the last one (A → B, Verse → Chorus). */
export const nextSection = (sections) => ({ label: NEXT_LABEL[sections.at(-1)?.label] ?? '', bars: Array(8).fill('') })

/** Typing or pasting "C | Am | F G |" into bar `b` spreads it over that bar and the ones after it. */
export const spreadBars = (bars, b, value) => {
  if (!value.includes('|')) return bars.map((t, i) => (i === b ? value : t))
  const pieces = value.split('|').map((t) => t.trim())
  while (pieces.length > 1 && pieces.at(-1) === '') pieces.pop()
  if (pieces[0] === '' && pieces.length > 1) pieces.shift()
  const next = [...bars]
  next.splice(b, Math.min(pieces.length, bars.length - b), ...pieces)
  return next.slice(0, CHART_LIMITS.barsPerSection)
}

/** Move section `s` up or down by `by`. */
export const moveSection = (sections, s, by) => {
  const next = [...sections]
  const [sec] = next.splice(s, 1)
  next.splice(Math.max(0, Math.min(sections.length - 1, s + by)), 0, sec)
  return next
}

/** Why someone reports a shared chart: offered as a short menu on the web and in the app. */
export const REPORT_REASONS = ['Spam', 'Wrong chords', 'Offensive']

export const CHART_HELP = [
  'One box is one bar. Put several chords in a box to split the bar: Dm7 G7 is two beats each.',
  '/ holds the chord for another beat (C / / G7 is three beats of C, one of G7). % repeats the bar before, an empty box keeps the last chord going and NC is a break.',
  'Chords like C, Am, F#m7b5, Bbmaj7, G7#9, Eb13, Dsus4, C/E all work (also -7, ^7, ø, o7).',
  'Paste a whole line like | C | Am | F G | C | into a box to fill several bars at once.',
]
