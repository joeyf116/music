import { useEffect, useState } from 'react'
import { notifyLocalChange, SYNC_EVENT } from './settingsSync.js'

const read = (key, initial) => {
  try {
    const stored = window.localStorage.getItem(key)
    return stored === null ? initial : JSON.parse(stored)
  } catch {
    return initial
  }
}

// useState that is saved to localStorage so practice settings survive a reload, and (when logged in) follow
// your account to other devices (settingsSync.js). A null key makes it a plain useState.
export default function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => (key === null ? initial : read(key, initial)))

  useEffect(() => {
    if (key === null) return
    try {
      const text = JSON.stringify(value)
      if (window.localStorage.getItem(key) === text) return
      window.localStorage.setItem(key, text)
      notifyLocalChange(key)
    } catch {
      // Storage may be unavailable (private mode); settings just won't persist.
    }
  }, [key, value])

  // Settings from your account arrived (you logged in on this device): pick up the new value.
  useEffect(() => {
    if (key === null) return undefined
    const onReplaced = (e) => {
      if (!e.detail?.keys || e.detail.keys.includes(key)) setValue(read(key, initial))
    }
    window.addEventListener(SYNC_EVENT, onReplaced)
    return () => window.removeEventListener(SYNC_EVENT, onReplaced)
    // `initial` is only the fallback for a missing key; a new object each render must not resubscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return [value, setValue]
}
