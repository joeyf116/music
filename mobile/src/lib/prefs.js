// Settings saved on the device, shared live between screens: when the Fretboard changes the key, every tab sees it.
// Keys and values match the web site's localStorage (music.key, music.scale…), so the same code reads them.
import { useCallback, useSyncExternalStore } from 'react'

const values = new Map()
const listeners = new Map()

const read = (key, initial) => {
  if (!values.has(key)) {
    let value = initial
    try {
      const stored = globalThis.localStorage?.getItem(key)
      if (stored != null) value = JSON.parse(stored)
    } catch {
      // Unreadable value: fall back to the default.
    }
    values.set(key, value)
  }
  return values.get(key)
}

export function setPref(key, value) {
  const next = typeof value === 'function' ? value(values.get(key)) : value
  if (Object.is(next, values.get(key))) return
  values.set(key, next)
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(next))
  } catch {
    // Storage unavailable: the setting still works until the app closes.
  }
  listeners.get(key)?.forEach((notify) => notify())
}

export function getPref(key, initial) {
  return read(key, initial)
}

/** Like useState, but saved and shared by key. */
export function usePref(key, initial) {
  const subscribe = useCallback(
    (notify) => {
      if (!listeners.has(key)) listeners.set(key, new Set())
      listeners.get(key).add(notify)
      return () => listeners.get(key).delete(notify)
    },
    [key],
  )
  const value = useSyncExternalStore(subscribe, () => read(key, initial))
  const set = useCallback((next) => setPref(key, next), [key])
  return [value, set]
}
