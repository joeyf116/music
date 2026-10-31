import { useEffect, useState } from 'react'

// A light record of which days you played something, so the header can show how the week is going.
// Any sound counts (a tab note, a chord, an exercise, a quiz answer): opening the app and playing one note is a practice day.
// Kept on this device only, and gentle on purpose: no penalties, a missed day just leaves a gap.

const STORAGE_KEY = 'music.practiceDays'
const EVENT = 'music:practice'
const KEEP_DAYS = 120

/** Local calendar day as YYYY-MM-DD (not UTC, so late-evening practice counts for that evening). */
export const dayKey = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)

/**
 * From a list of practised days: the last seven days (oldest first, ending today), how many of them were
 * practice days, and the run of consecutive days up to today. Today not played yet doesn't break the run.
 */
export const practiceSummary = (days, today = new Date()) => {
  const set = new Set(days)
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6)
    return { day: dayKey(date), date, practiced: set.has(dayKey(date)) }
  })
  let streak = 0
  for (let i = set.has(dayKey(today)) ? 0 : 1; set.has(dayKey(addDays(today, -i))); i++) streak++
  return { week, count: week.filter((d) => d.practiced).length, streak, today: set.has(dayKey(today)) }
}

/** Adds `today` to the list (once) and drops days older than the window. Returns a new list. */
export const withDay = (days, today = new Date()) => {
  const key = dayKey(today)
  const oldest = dayKey(addDays(today, -KEEP_DAYS))
  return [...new Set([...days, key])].filter((d) => d >= oldest).sort()
}

const read = () => {
  try {
    const days = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(days) ? days.filter((d) => typeof d === 'string') : []
  } catch {
    return []
  }
}

let markedToday = null

/** Records today as a practice day (cheap to call on every note). */
export function markPracticed() {
  if (typeof window === 'undefined') return
  const today = dayKey(new Date())
  if (markedToday === today) return
  markedToday = today
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withDay(read())))
  } catch {
    // Storage may be unavailable (private mode): the week view just stays empty.
  }
  window.dispatchEvent(new Event(EVENT))
}

/** The practice summary, kept up to date as you play. */
export function usePracticeLog() {
  const [days, setDays] = useState(read)
  useEffect(() => {
    const update = () => setDays(read())
    window.addEventListener(EVENT, update)
    // Another tab, or the app left open past midnight.
    window.addEventListener('storage', update)
    window.addEventListener('focus', update)
    return () => {
      window.removeEventListener(EVENT, update)
      window.removeEventListener('storage', update)
      window.removeEventListener('focus', update)
    }
  }, [])
  return practiceSummary(days)
}
