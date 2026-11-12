// The practice tab: voicings and scale runs pinned from the Fretboard page, played back as one looping tab.
// Kept free of React and the DOM so the web page and the iOS / Android app (mobile/) share it.
import { finalize, meterInfo, parseProgression, voiceProgression } from './exercises.js'

/** How long a pinned chord rings before the next item, in beats. */
export const BEAT_OPTIONS = [1, 2, 4, 8]
/** How chords sound when the practice tab plays. */
export const CHORD_STYLES = [
  { value: 'strum', label: 'Strum' },
  { value: 'arpeggio', label: 'Arpeggio' },
  { value: 'block', label: 'Block' },
]

const METER = meterInfo('4/4')

let counter = 0
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`

/**
 * A pinned item from the page's `pin` ({ kind, name, detail, key, tuningId, columns }). Each item keeps the frets
 * it was pinned with, so changing the key or view later never changes it. Chords ring for 4 beats by default.
 */
export const createItem = (pin, id = newId()) => ({ ...pin, id, beats: pin.kind === 'chord' ? 4 : 1 })

/** Stored items that still make sense (anything else is dropped rather than breaking the page). */
export const validItems = (items) =>
  Array.isArray(items)
    ? items.filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          Array.isArray(item.columns) &&
          item.columns.length > 0 &&
          item.columns.every((c) => Array.isArray(c?.notes) && c.notes.every((n) => Number.isInteger(n?.string) && Number.isInteger(n?.fret))),
      )
    : []

export const addItem = (items, item) => [...items, item]
export const removeItem = (items, index) => items.filter((_, i) => i !== index)
/** Move an item one place earlier (delta -1) or later (+1); out-of-range moves leave the list as it is. */
export const moveItem = (items, index, delta) => {
  const to = index + delta
  if (index < 0 || index >= items.length || to < 0 || to >= items.length) return items
  const next = [...items]
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}
export const setItemBeats = (items, index, beats) => items.map((item, i) => (i === index && BEAT_OPTIONS.includes(beats) ? { ...item, beats } : item))

/**
 * The tab for the whole practice tab: every item's columns in order, the item's name above its first column and a
 * bar line between items. `owner[i]` is the item index of column i.
 */
export const practiceColumns = (items) => {
  const columns = []
  const owner = []
  items.forEach((item, k) => {
    item.columns.forEach((c, j) => {
      columns.push({ notes: c.notes, heading: j === 0 ? item.name : undefined, groupStart: j === 0 && k > 0 })
      owner.push(k)
    })
  })
  return { columns, owner }
}

/**
 * The practice tab as a score for the player (src/lib/player.js): single notes last a beat, a chord rings for its
 * item's beats. `style` 'strum' rolls chords down, 'block' plucks them together and 'arpeggio' spreads their notes
 * over those beats, low to high. Every event carries `column`, the tab column it belongs to. Notes on strings the
 * current tuning doesn't have are left out; the rest are played on the same frets in the current tuning.
 */
export const practiceScore = (items, tuning, chosenStyle = 'strum') => {
  const style = CHORD_STYLES.some((c) => c.value === chosenStyle) ? chosenStyle : 'strum'
  const { beatTicks } = METER
  const events = []
  let tick = 0
  let column = 0
  const note = (n) => ({ string: n.string, fret: n.fret, pitch: tuning[n.string] + n.fret })
  for (const item of items) {
    for (const c of item.columns) {
      const notes = c.notes.filter((n) => n.string < tuning.length).map(note)
      const chord = notes.length > 1
      const length = (chord ? item.beats || 4 : 1) * beatTicks
      if (chord && style === 'arpeggio') {
        const sorted = [...notes].sort((a, b) => a.pitch - b.pitch)
        const step = Math.max(1, Math.floor(length / sorted.length))
        sorted.forEach((n, i) => events.push({ notes: [n], tick: tick + i * step, column }))
      } else events.push({ notes, tick, column, ...(chord && style === 'strum' ? { strum: 'down' } : {}) })
      tick += length
      column++
    }
  }
  // Round up to whole bars so the click keeps counting in four when the tab loops.
  const totalTicks = Math.max(METER.barTicks, Math.ceil(tick / METER.barTicks) * METER.barTicks)
  return finalize({ events, totalTicks }, METER)
}

/**
 * Items for a chord progression in a key ("I V vi IV", "Am F C G"), voiced close together on the neck.
 * Returns { items, errors } where errors lists the tokens that couldn't be read.
 */
export const progressionItems = (text, key, tuning, tuningId, area = 'open') => {
  const { chords, errors } = parseProgression(text, key)
  const voicings = voiceProgression(chords, tuning, area)
  const tokens = text.split(/[\s,|–—-]+/).filter(Boolean).filter((t) => !errors.includes(t))
  const items = chords.map((chord, i) =>
    createItem({
      kind: 'chord',
      name: chord.name,
      detail: `${tokens[i] ?? chord.name} in ${key}`,
      key,
      tuningId,
      columns: [{ notes: voicings[i].map((n) => ({ string: n.string, fret: n.fret })) }],
    }),
  )
  return { items, errors }
}
