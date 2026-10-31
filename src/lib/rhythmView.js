// The Rhythm page's settings and words, shared by the web page (components/RhythmPage.jsx and its tabs) and the app,
// so both start from the same defaults and say the same things.
import { fitAccents, gapStatus, rhythmById } from './rhythm.js'

export const RHYTHM_TAB_KEY = 'music.rhythmTab'
export const RHYTHM_TABS = [
  { id: 'metronome', label: 'Metronome' },
  { id: 'rhythms', label: 'Rhythms' },
  { id: 'timing', label: 'Timing' },
  { id: 'drills', label: 'Drills' },
]
export const RHYTHM_ABOUT = {
  metronome: 'Set a tempo, choose how the beat is split and what it sounds like. Gap click and the speed trainer build your inner clock.',
  rhythms: 'Strumming rhythms from simple to tricky, shown as counts, strum arrows and tab. Listen, count, then play along.',
  // The Timing tab explains itself in its own first line.
  drills: 'Scale, arpeggio and chord drills in tab that play in time with the click.',
}

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

// ---- Timing test ----

// How much of the click you get. Less click = more of the time is yours to keep.
export const CLICK_MODES = [
  { value: 'full', label: 'Every beat', title: 'Click on every beat' },
  { value: 'one', label: 'Beat 1 only', title: 'Only the first beat of each bar clicks' },
  { value: 'backbeat', label: '2 & 4', title: 'Only the backbeat clicks, like a drummer’s snare' },
  { value: 'gap', label: 'Gaps', title: 'Two bars of click, then two bars of silence' },
]

/** The bar's accents for a click mode (beat 1 only, backbeat only, or as set). */
export const clickModeAccents = (mode, accents) => {
  if (mode === 'one') return accents.map((a, i) => (i === 0 ? 'accent' : 'mute'))
  if (mode === 'backbeat') return accents.map((a, i) => (i % 2 === 1 ? 'accent' : 'mute'))
  return accents
}

export const clickModeGap = (mode) => (mode === 'gap' ? { on: true, play: 2, mute: 2 } : { on: false })

export const timingStatus = (pulse, gap) => {
  if (!pulse) return ''
  if (pulse.bar < 0) return `Count-in ${pulse.beat + 1}… start tapping on 1`
  return gapStatus(pulse.bar, gap) || `Bar ${pulse.bar + 1} · beat ${pulse.beat + 1}`
}

/** What the tap pad says about the last tap. */
export const tapVerdict = (last, idle) => {
  if (!last) return idle
  if (last.miss) return 'No beat near that tap'
  return `${last.label}${last.grade === 'perfect' ? '' : ` · ${last.ms > 0 ? '+' : ''}${last.ms} ms`}`
}

/** Where a tap sits on an early ← → late scale of ±100 ms, as a percentage across. */
export const tapPosition = (ms) => 50 + Math.max(-100, Math.min(100, ms)) / 2

// ---- Strumming rhythms ----

export const RHYTHM_DRILL_KEY = 'music.rhythmDrill'
export const RHYTHM_DRILL_DEFAULTS = { level: 1, rhythm: 'q-e-q-e', beats: rhythmById('q-e-q-e').beats, playOn: 'muted', mode: 'listen', countIn: true, clickGrid: false, showTab: true }
export const DRILL_MODES = [
  { value: 'listen', label: 'Listen', title: 'Hear the rhythm with the click' },
  { value: 'along', label: 'Play along', title: 'Only the click plays; you strum the rhythm' },
]
export const BEAT_GRIDS = [
  { value: 2, label: '8ths' },
  { value: 3, label: 'Trip' },
  { value: 4, label: '16ths' },
]
const RHYTHM_COLUMN_WIDTH = { 1: 34, 2: 30, 3: 26, 4: 22, 6: 18 }
/** Tab column width for a pattern whose busiest beat has `finest` cells. */
export const rhythmColumnWidth = (finest) => RHYTHM_COLUMN_WIDTH[finest] ?? 24

export const RHYTHM_STEPS = [
  ['Listen', 'once or twice and follow the boxes.'],
  ['Count out loud', '(“1 & 2 &…”) and clap or tap the filled boxes.'],
  ['Play along', 'on muted strings, keeping your strumming hand moving down-up even through the gaps.'],
  ['Speed up', 'only when it feels easy at this tempo; 5 BPM at a time.'],
]
