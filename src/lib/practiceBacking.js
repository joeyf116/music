// The practice tab's backing (a click, or the Drums page's groove on the same beat), shared by the app-wide player
// (usePlayer.jsx) and the pages.
import { kitById } from './drumEngine.js'
import { sameLoop } from './drumEdit.js'
import { isValidLoop } from './drumLoops.js'
import { presetById, presetKit } from './drumPresets.js'
import { SAVED_KEY, findGroove } from './drumSaved.js'

export const BACKINGS = [
  { value: 'off', label: 'Off' },
  { value: 'click', label: 'Click' },
  { value: 'groove', label: 'Groove' },
]
export const CURRENT_GROOVE_KEY = 'music.drums.current'
const DEFAULT_GROOVE = 'basic-rock'
export const clampBpm = (bpm) => Math.max(30, Math.min(300, Number(bpm) || 100))

const readStored = (key, fallback) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}

/** The groove the Drums page has loaded (with any edits), as the drum engine wants it. */
export function currentGroove(bpm) {
  const loopId = readStored('music.drums.loop', DEFAULT_GROOVE)
  const preset = findGroove(loopId, readStored(SAVED_KEY, [])) ?? presetById(DEFAULT_GROOVE)
  const stored = readStored(CURRENT_GROOVE_KEY, null)
  const loop = isValidLoop(stored) ? stored : preset
  const kit = kitById(readStored('music.drums.kit', presetKit(preset))).id
  return {
    name: `${preset?.name ?? 'Groove'}${preset && !sameLoop(loop, preset) ? ' (edited)' : ''}`,
    settings: { loop, kit, bpm: clampBpm(bpm), volume: readStored('music.drums.volume', 0.8), humanize: readStored('music.drums.humanize', 0), click: null },
  }
}

