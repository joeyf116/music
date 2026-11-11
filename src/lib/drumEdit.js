// Editing drum loops. Every function returns a new loop and leaves the one it was given alone, so edits can be
// undone by keeping the old loops (see historyReducer).
import { DRUM_VOICES, barCount, stepCount, stepsPerBar, trackMix } from './drumLoops.js'

/** Time signatures you can switch a groove to: beats per bar and steps per beat. */
export const METERS = [
  { id: '4/4', label: '4/4 (16th notes)', beats: 4, steps: 4 },
  { id: '4/4-8', label: '4/4 (8th notes)', beats: 4, steps: 2 },
  { id: '3/4', label: '3/4', beats: 3, steps: 4 },
  { id: '5/4', label: '5/4', beats: 5, steps: 4 },
  { id: '6/8', label: '6/8', beats: 2, steps: 3 },
  { id: '9/8', label: '9/8', beats: 3, steps: 3 },
  { id: '12/8', label: '12/8 (shuffle, ballads)', beats: 4, steps: 3 },
]

export const PAINT_LEVELS = [
  { value: 'x', label: 'Hit' },
  { value: 'X', label: 'Accent' },
  { value: 'g', label: 'Ghost' },
]

/** Sets one step of one drum to '.', 'x', 'X' or 'g'. */
export function setStep(loop, voice, step, level) {
  const steps = loop.tracks[voice]
  if (steps === undefined || step < 0 || step >= steps.length || steps[step] === level) return loop
  return { ...loop, tracks: { ...loop.tracks, [voice]: steps.slice(0, step) + level + steps.slice(step + 1) } }
}

/**
 * What a press on a step does: an empty step is painted with the chosen level, a painted one is cleared.
 * Dragging along the row keeps doing the same thing (painting or clearing) to every step it crosses.
 */
export const pressMode = (loop, voice, step, level) => (loop.tracks[voice]?.[step] === '.' ? level : '.')

/** Adds a drum with an empty row (no change if it is already there). */
export function addVoice(loop, voice) {
  if (loop.tracks[voice] !== undefined || !DRUM_VOICES.some((v) => v.id === voice)) return loop
  return { ...loop, tracks: { ...loop.tracks, [voice]: '.'.repeat(stepCount(loop)) } }
}

/** Removes a drum and its mix settings. The last drum stays, so a loop is never empty of rows. */
export function removeVoice(loop, voice) {
  if (loop.tracks[voice] === undefined || Object.keys(loop.tracks).length === 1) return loop
  const tracks = { ...loop.tracks }
  delete tracks[voice]
  const mix = { ...loop.mix }
  delete mix[voice]
  return { ...loop, tracks, mix }
}

/** Changes one drum's volume / mute / solo. Values back at their defaults are dropped to keep loops small. */
export function setMix(loop, voice, patch) {
  const next = { ...trackMix(loop, voice), ...patch }
  const stored = {}
  if (next.volume !== 1) stored.volume = Math.round(Math.max(0, Math.min(1, next.volume)) * 100) / 100
  if (next.mute) stored.mute = true
  if (next.solo) stored.solo = true
  const mix = { ...loop.mix }
  if (Object.keys(stored).length) mix[voice] = stored
  else delete mix[voice]
  return { ...loop, mix }
}

/** Every step back to a rest, keeping the drums and the mix. */
export const clearSteps = (loop) => ({
  ...loop,
  tracks: Object.fromEntries(Object.keys(loop.tracks).map((v) => [v, '.'.repeat(stepCount(loop))])),
})

const STRENGTH = { '.': 0, g: 1, x: 2, X: 3 }

/**
 * Changes beats per bar, steps per beat or the number of bars. Hits move to the nearest step of the new grid
 * (keeping the stronger hit where two land together), and new bars repeat the existing ones, the way a
 * drummer would carry on the groove.
 */
export function setGrid(loop, { beats = loop.beats, steps = loop.steps, bars = barCount(loop) }) {
  const next = { ...loop, beats, steps, bars }
  if (bars === 1) delete next.bars
  const oldBar = stepsPerBar(loop)
  const newBar = beats * steps
  const oldBars = barCount(loop)
  next.tracks = Object.fromEntries(
    Object.entries(loop.tracks).map(([voice, pattern]) => {
      const out = Array.from({ length: bars * newBar }, () => '.')
      for (let bar = 0; bar < bars; bar++) {
        const from = (bar % oldBars) * oldBar
        for (let i = 0; i < oldBar; i++) {
          const c = pattern[from + i]
          if (c === '.' || c === undefined) continue
          const beat = i / loop.steps // position in beats, kept when the grid changes
          if (beat >= beats) continue // beats beyond a shorter bar are dropped
          const j = bar * newBar + Math.min(newBar - 1, Math.round(beat * steps))
          if (STRENGTH[c] > STRENGTH[out[j]]) out[j] = c
        }
      }
      return [voice, out.join('')]
    }),
  )
  return next
}

/** True when two loops would sound and look the same (used to mark a groove as edited). */
export const sameLoop = (a, b) =>
  !!a && !!b && a.beats === b.beats && a.steps === b.steps && barCount(a) === barCount(b) && (a.swing ?? 0) === (b.swing ?? 0) && JSON.stringify(a.tracks) === JSON.stringify(b.tracks)

const HISTORY = 100

/**
 * Undo / redo for the loop being edited. Actions:
 *   { type: 'set', loop }       a new edit (can be undone)
 *   { type: 'continue', loop }  more of the same gesture, e.g. dragging along a row (joins the last edit)
 *   { type: 'undo' } / { type: 'redo' }
 */
export function historyReducer(state, action) {
  const { past, present, future } = state
  switch (action.type) {
    case 'set':
      if (action.loop === present) return state
      return { past: [...past, present].slice(-HISTORY), present: action.loop, future: [] }
    case 'continue':
      return action.loop === present ? state : { past, present: action.loop, future: [] }
    case 'undo':
      return past.length ? { past: past.slice(0, -1), present: past.at(-1), future: [present, ...future] } : state
    case 'redo':
      return future.length ? { past: [...past, present], present: future[0], future: future.slice(1) } : state
    default:
      return state
  }
}

export const startHistory = (loop) => ({ past: [], present: loop, future: [] })
