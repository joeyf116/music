import { useCallback, useRef, useState } from 'react'
import { audioContext } from './audio.js'
import { judgeTap, summarizeTaps } from './rhythm.js'
import { eventTime } from './rhythmEngine.js'

const KEEP = 40

/**
 * Timing judge for tapping along: register target times as they are scheduled (`addTarget`), then call `tap(event)`
 * from a pointer or key press. `correction` (ms) is subtracted from every tap, for headphones that add delay.
 */
export default function useTapJudge(correction = 0) {
  const targets = useRef([])
  const [results, setResults] = useState([])
  const addTarget = useCallback((time) => {
    const list = targets.current
    list.push(time)
    if (list.length > 64) list.splice(0, list.length - 64)
  }, [])
  const tap = useCallback(
    (event) => {
      const ac = audioContext()
      if (!ac) return null
      const result = judgeTap(eventTime(ac, event) - correction / 1000, targets.current)
      setResults((r) => [...r.slice(-(KEEP - 1)), result ?? { miss: true, at: Date.now() }])
      return result
    },
    [correction],
  )
  const reset = useCallback(() => {
    setResults([])
  }, [])
  const clearTargets = useCallback(() => {
    targets.current = []
  }, [])
  const judged = results.filter((r) => !r.miss)
  return { results, last: results[results.length - 1] ?? null, summary: summarizeTaps(judged.map((r) => r.ms)), addTarget, tap, reset, clearTargets }
}
