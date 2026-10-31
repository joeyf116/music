// Settings saved on the device, shared live between screens: when the Fretboard changes the key, every tab sees it.
// Keys and values match the web site's localStorage (music.key, music.scale…), so the shared code reads them too.
import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { View } from '@music/fretboardView.js'

/** Every saved setting, with its type. */
export interface Prefs {
  'music.key': string
  'music.scale': string
  'music.tuning': string
  'music.bpm': number
  'music.mode': View
  'music.chordDegree': number
  'music.chordType': string
  'music.diatonicSevenths': boolean
  'music.dropVoicing': string
  'music.labels': 'notes' | 'intervals'
  'music.showAll': boolean
  'music.scaleLayout': string
  'music.fretPosition': number | 'all'
  'music.stringSet': number
  'music.fretProgression': string
  'music.progressionNeck': string
}
export type PrefKey = keyof Prefs
/** Settings that hold a free string, which a picker sheet can set. */
export type StringPrefKey = { [K in PrefKey]: string extends Prefs[K] ? K : never }[PrefKey]

export const PREF_DEFAULTS: Prefs = {
  'music.key': 'A',
  'music.scale': 'minorPentatonic',
  'music.tuning': 'standard',
  'music.bpm': 100,
  'music.mode': 'scale',
  'music.chordDegree': 0,
  'music.chordType': '',
  'music.diatonicSevenths': false,
  'music.dropVoicing': 'drop2',
  'music.labels': 'notes',
  'music.showAll': true,
  'music.scaleLayout': 'position',
  'music.fretPosition': 0,
  'music.stringSet': 0,
  'music.fretProgression': 'I V vi IV',
  'music.progressionNeck': 'open',
}

export type Update<T> = T | ((previous: T) => T)

const values = new Map<string, unknown>()
const listeners = new Map<string, Set<() => void>>()

// The JSON shape of a value, so a stored value is only trusted if it has the same shape as its default.
const shape = (value: unknown) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value)

function readKey<T>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  if (!values.has(key)) {
    let value = fallback
    try {
      const stored = globalThis.localStorage?.getItem(key)
      const parsed: unknown = stored == null ? undefined : JSON.parse(stored)
      if (valid(parsed)) value = parsed
    } catch {
      // Unreadable value: keep the default.
    }
    values.set(key, value)
  }
  return values.get(key) as T
}

function writeKey<T>(key: string, previous: T, update: Update<T>): void {
  const next = typeof update === 'function' ? (update as (previous: T) => T)(previous) : update
  if (Object.is(next, previous)) return
  values.set(key, next)
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(next))
  } catch {
    // Storage unavailable: the setting still works until the app closes.
  }
  listeners.get(key)?.forEach((notify) => notify())
}

const subscribeKey = (key: string) => (notify: () => void) => {
  let set = listeners.get(key)
  if (!set) listeners.set(key, (set = new Set()))
  set.add(notify)
  return () => {
    set.delete(notify)
  }
}

// A stored value is only trusted if it has the same JSON type as the default (or is 'all' for the position).
const validPref =
  <K extends PrefKey>(key: K) =>
  (value: unknown): value is Prefs[K] =>
    shape(value) === shape(PREF_DEFAULTS[key]) || (key === 'music.fretPosition' && value === 'all')

const read = <K extends PrefKey>(key: K): Prefs[K] => readKey(key, PREF_DEFAULTS[key], validPref(key))

export const getPref = <K extends PrefKey>(key: K): Prefs[K] => read(key)

export function setPref<K extends PrefKey>(key: K, update: Update<Prefs[K]>): void {
  writeKey(key, read(key), update)
}

/** Like useState, but saved on the device and shared by key across every screen. */
export function usePref<K extends PrefKey>(key: K): [Prefs[K], (update: Update<Prefs[K]>) => void] {
  const subscribe = useCallback((notify: () => void) => subscribeKey(key)(notify), [key])
  const value = useSyncExternalStore(subscribe, () => read(key))
  const update = useCallback((next: Update<Prefs[K]>) => setPref(key, next), [key])
  return [value, update]
}

/**
 * A screen's own saved setting (a quiz's options, the metronome's settings…): like useState, saved on the device
 * under `key` and shared live with anything else reading it. A stored value of another JSON shape than `fallback`
 * (say an object where an array is expected) is ignored. Keys match the web site's localStorage.
 */
export function useStored<T>(key: string, fallback: T): [T, (update: Update<T>) => void] {
  const fallbackRef = useRef(fallback)
  const valid = useCallback((value: unknown): value is T => shape(value) === shape(fallbackRef.current), [])
  const subscribe = useCallback((notify: () => void) => subscribeKey(key)(notify), [key])
  const value = useSyncExternalStore(subscribe, () => readKey(key, fallbackRef.current, valid))
  const update = useCallback((next: Update<T>) => writeKey(key, readKey(key, fallbackRef.current, valid), next), [key, valid])
  return [value, update]
}
