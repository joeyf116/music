import { useEffect, useState } from 'react'

// useState that is saved to localStorage so practice settings survive a reload.
export default function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored === null ? initial : JSON.parse(stored)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage may be unavailable (private mode); settings just won't persist.
    }
  }, [key, value])

  return [value, setValue]
}
