// The metronome's saved settings and words, shared by the web (components/Metronome.jsx) and the app,
// so both start from the same defaults and say the same things.
import { fitAccents, gapStatus } from './rhythm.js'

export const METRONOME_KEY = 'music.metronome'
export const DEFAULT_METRONOME = {
  bpm: 90,
  meter: '4/4',
  accents: null,
  subdivision: 'beats',
  volume: 0.8,
  subVolume: 0.6,
  countIn: false,
  gap: { on: false, play: 2, mute: 2 },
  speed: { on: false, step: 2, every: 4, max: 160 },
  tapCorrection: 0,
}

/** Saved metronome settings over the defaults (nested trainers too), with the accents fitted to the meter. */
export const metronomeSettings = (stored) => {
  const settings = { ...DEFAULT_METRONOME, ...stored, gap: { ...DEFAULT_METRONOME.gap, ...stored?.gap }, speed: { ...DEFAULT_METRONOME.speed, ...stored?.speed } }
  settings.accents = fitAccents(settings.accents, settings.meter)
  return settings
}

export const ACCENT_NAMES = { accent: 'accented', beat: 'normal', mute: 'silent' }

/** The metronome's status line: count-in, the gap trainer, or the bar number while the speed trainer runs. */
export const metronomeStatus = (pulse, settings) => {
  if (!pulse) return ''
  if (pulse.bar < 0) return `Count-in ${pulse.beat + 1}…`
  return gapStatus(pulse.bar, settings.gap) || (settings.speed.on ? `Bar ${pulse.bar + 1}` : '')
}
