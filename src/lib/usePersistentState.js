import { useEffect, useState } from 'react'

// useState that is saved to localStorage so practice settings survive a reload.
// A null key makes it a plain useState (for components that only sometimes persist).
export default function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    if (key === null) return initial
    try {
      const stored = window.localStorage.getItem(key)
      return stored === null ? initial : JSON.parse(stored)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    if (key === null) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage may be unavailable (private mode); settings just won't persist.
    }
  }, [key, value])

  return [value, setValue]
}
