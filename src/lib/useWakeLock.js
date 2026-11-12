import { useEffect } from 'react'

// Keeps the phone's screen on while something is playing, so it doesn't lock with both hands on the guitar.
// Browsers drop the lock when the tab is hidden; it is taken again when you come back.
export default function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return undefined
    let lock = null
    let done = false
    const take = () => {
      if (done || document.visibilityState !== 'visible') return
      navigator.wakeLock.request('screen').then(
        (l) => {
          if (done) l.release().catch(() => {})
          else lock = l
        },
        () => {},
      )
    }
    take()
    document.addEventListener('visibilitychange', take)
    return () => {
      done = true
      document.removeEventListener('visibilitychange', take)
      lock?.release().catch(() => {})
    }
  }, [active])
}
