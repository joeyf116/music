// The app-wide musical settings (one key, scale, tuning and tempo for every tab), as on the web site.
import { KEYS, TUNINGS, pcName, usesFlats } from '@music/theory.js'
import { usePref } from './prefs'

export function useMusic() {
  const [key, setKey] = usePref('music.key', 'A')
  const [scaleType, setScaleType] = usePref('music.scale', 'minorPentatonic')
  const [tuningId, setTuningId] = usePref('music.tuning', 'standard')
  const [bpm, setBpm] = usePref('music.bpm', 100)
  const keyName = KEYS.includes(key) ? key : 'C'
  const tuningSpec = TUNINGS[tuningId] ?? TUNINGS.standard
  const tuning = tuningSpec.pitches
  // Open strings follow the tuning's own spelling (Eb standard reads Eb, not D#), otherwise the key's.
  const stringName = (s) => pcName(tuning[s], tuningSpec.flats ?? usesFlats(keyName))
  return { keyName, setKey, scaleType, setScaleType, tuningId, setTuningId, tuningSpec, tuning, stringName, bpm, setBpm }
}
