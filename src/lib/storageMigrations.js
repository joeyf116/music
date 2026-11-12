// One-off fixes to settings saved by older versions of the site. Each one is safe to run again and again: it runs
// when the page opens and whenever an account's settings arrive from another device.

export const PRACTICE_CHORD_STYLE = 'music.chordStyle'
export const QUIZ_PLAY_STYLE = 'music.quizPlayStyle'

const read = (storage, key) => {
  try {
    const text = storage.getItem(key)
    return text === null ? undefined : JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * The chord quiz and the practice tab used to share `music.chordStyle`, with different values for the same words
 * ('block' was Strum in the quiz and Block in the practice tab). The quiz now has its own setting. 'both' only ever
 * came from the quiz, so it moves to the quiz and the practice tab goes back to its default (strum).
 * Returns the keys it changed.
 */
export function migrateSettings(storage = globalThis.localStorage) {
  const changed = []
  try {
    if (read(storage, PRACTICE_CHORD_STYLE) === 'both') {
      if (read(storage, QUIZ_PLAY_STYLE) === undefined) {
        storage.setItem(QUIZ_PLAY_STYLE, JSON.stringify('both'))
        changed.push(QUIZ_PLAY_STYLE)
      }
      storage.setItem(PRACTICE_CHORD_STYLE, JSON.stringify('strum'))
      changed.push(PRACTICE_CHORD_STYLE)
    }
  } catch {
    // Storage blocked: nothing saved, nothing to fix.
  }
  return changed
}
