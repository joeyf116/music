// Your own grooves: any groove you've changed, saved under a name with its kit and tempo. They live with your
// other settings (music.drums.saved), so they follow your account to other devices, and show as a "Saved" style
// on the Drums page. The practice tab's Groove backing plays whichever one is loaded.
import { isValidLoop } from './drumLoops.js'
import { presetById } from './drumPresets.js'

export const SAVED_KEY = 'music.drums.saved'
export const SAVED_STYLE = 'Saved'
export const NAME_MAX = 40
export const SAVED_MAX = 50

/** Saved grooves that still make sense (storage can hold anything). */
export const validSaved = (list) => (Array.isArray(list) ? list.filter((g) => g && typeof g.id === 'string' && typeof g.name === 'string' && isValidLoop(g)) : [])

/** A tidy name: trimmed, one line, at most NAME_MAX characters; empty means "use the fallback". */
export const cleanName = (name, fallback) => (String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) || fallback)

/** Saves `loop` as a new groove at the front of the list (newest first, at most SAVED_MAX). */
export function saveGroove(list, loop, { name, kit, bpm, now = Date.now() }) {
  const { id: _id, name: _name, style: _style, ...rest } = loop
  const groove = { ...rest, bpm, id: `saved-${now.toString(36)}`, name: cleanName(name, 'My groove'), style: SAVED_STYLE, kit }
  return { list: [groove, ...validSaved(list)].slice(0, SAVED_MAX), groove }
}

/** Replaces the steps (and kit / tempo) of a saved groove, keeping its name and place. */
export const updateSaved = (list, id, loop, { kit, bpm }) =>
  validSaved(list).map((g) => {
    if (g.id !== id) return g
    const { id: _id, name: _name, style: _style, ...rest } = loop
    return { ...rest, bpm, id: g.id, name: g.name, style: SAVED_STYLE, kit }
  })

export const removeSaved = (list, id) => validSaved(list).filter((g) => g.id !== id)

/** A groove by id: one of yours, or a ready-made one. */
export const findGroove = (id, saved) => validSaved(saved).find((g) => g.id === id) ?? presetById(id)
