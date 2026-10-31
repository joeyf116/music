// The app-wide musical settings (one key, scale, tuning and tempo for every tab), as on the web site.
import { KEYS, TUNINGS, pcName, usesFlats, type Tuning } from '@music/theory.js'
import { usePref } from './prefs'

export interface Music {
  keyName: string
  setKey: (key: string) => void
  scaleType: string
  setScaleType: (id: string) => void
  tuningId: string
  setTuningId: (id: string) => void
  tuningSpec: Tuning
  tuning: number[]
  stringName: (string: number) => string
  bpm: number
  setBpm: (bpm: number) => void
}

export function useMusic(): Music {
  const [key, setKey] = usePref('music.key')
  const [scaleType, setScaleType] = usePref('music.scale')
  const [tuningId, setTuningId] = usePref('music.tuning')
  const [bpm, setBpm] = usePref('music.bpm')
  const keyName = KEYS.includes(key) ? key : 'C'
  const tuningSpec = TUNINGS[tuningId] ?? TUNINGS.standard
  const tuning = tuningSpec.pitches
  // Open strings follow the tuning's own spelling (Eb standard reads Eb, not D#), otherwise the key's.
  const stringName = (s: number) => pcName(tuning[s], tuningSpec.flats ?? usesFlats(keyName))
  return { keyName, setKey, scaleType, setScaleType, tuningId, setTuningId, tuningSpec, tuning, stringName, bpm, setBpm }
}
