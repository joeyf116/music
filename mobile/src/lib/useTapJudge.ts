// Timing judge for tapping along (the web's src/lib/useTapJudge.js, for touches): register target times as they are
// scheduled (`addTarget`), then call `tap()` the moment a finger lands. `correction` (ms) is taken off every tap,
// for Bluetooth headphones that add delay.
import { useCallback, useRef, useState } from 'react'
import { audioContext } from '@music/audio.js'
import { judgeTap, summarizeTaps, type TapResult, type TapSummary } from '@music/rhythm.js'
import { heardNow } from '@music/rhythmEngine.js'

const KEEP = 40

export type Tap = TapResult | { miss: true; at: number }
export const isMiss = (tap: Tap): tap is { miss: true; at: number } => 'miss' in tap

export interface TapJudge {
  results: Tap[]
  last: Tap | null
  summary: TapSummary | null
  addTarget: (time: number) => void
  tap: () => void
  reset: () => void
  clearTargets: () => void
}

export default function useTapJudge(correction = 0): TapJudge {
  const targets = useRef<number[]>([])
  const [results, setResults] = useState<Tap[]>([])
  const addTarget = useCallback((time: number) => {
    const list = targets.current
    list.push(time)
    if (list.length > 64) list.splice(0, list.length - 64)
  }, [])
  const tap = useCallback(() => {
    const ac = audioContext()
    if (!ac) return
    const result = judgeTap(heardNow(ac) - correction / 1000, targets.current)
    setResults((r) => [...r.slice(-(KEEP - 1)), result ?? { miss: true, at: Date.now() }])
  }, [correction])
  const reset = useCallback(() => setResults([]), [])
  const clearTargets = useCallback(() => {
    targets.current = []
  }, [])
  const judged = results.filter((r): r is TapResult => !isMiss(r))
  return { results, last: results[results.length - 1] ?? null, summary: summarizeTaps(judged.map((r) => r.ms)), addTarget, tap, reset, clearTargets }
}
