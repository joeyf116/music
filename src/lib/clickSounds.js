// Metronome voices. Every sound is synthesised with Web Audio (no sample files to download), in two families:
// "natural" sounds modelled on real percussion (woodblock, clave, cowbell…) and "digital" beeps and ticks.
// Each voice plays three levels: the bar's accent, the other beats, and the quieter subdivisions in between.
import { audioContext } from './audio.js'

export const LEVELS = ['accent', 'beat', 'sub']
const LEVEL_GAIN = { accent: 1, beat: 0.72, sub: 0.42 }

let noise = null
const noiseBuffer = (ac) => {
  if (noise && noise.sampleRate === ac.sampleRate) return noise
  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return noise
}

// A decaying envelope on a fresh gain node.
const envelope = (ac, out, time, peak, decay, attack = 0.001) => {
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, time)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay)
  g.connect(out)
  return g
}

const tone = (ac, out, time, { type = 'sine', freq, peak, decay, drop = 1, attack }) => {
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, time)
  if (drop !== 1) osc.frequency.exponentialRampToValueAtTime(freq * drop, time + decay)
  osc.connect(envelope(ac, out, time, peak, decay, attack))
  osc.start(time)
  osc.stop(time + decay + 0.05)
}

const burst = (ac, out, time, { filter = 'bandpass', freq, q = 1, peak, decay }) => {
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac)
  const f = ac.createBiquadFilter()
  f.type = filter
  f.frequency.value = freq
  f.Q.value = q
  src.connect(f).connect(envelope(ac, out, time, peak, decay))
  src.start(time, Math.random() * 0.5)
  src.stop(time + decay + 0.05)
}

// A resonant body (woodblock, clave): a pitched sine "ring" plus a short filtered knock.
const knock = (freq, ring, knockFreq) => (ac, out, time, level) => {
  const pitch = level === 'accent' ? freq * 1.25 : level === 'sub' ? freq * 0.9 : freq
  tone(ac, out, time, { freq: pitch, peak: 0.55, decay: ring })
  burst(ac, out, time, { freq: knockFreq ?? pitch * 2, q: 3, peak: 0.35, decay: 0.012 })
}

/** Every metronome voice: { id, name, family, play(ac, out, time, level) }. */
export const CLICK_SOUNDS = [
  { id: 'woodblock', name: 'Woodblock', family: 'Natural', play: knock(880, 0.06) },
  { id: 'clave', name: 'Clave', family: 'Natural', play: knock(2400, 0.05, 3500) },
  {
    id: 'sticks',
    name: 'Drumsticks',
    family: 'Natural',
    play: (ac, out, time, level) => {
      burst(ac, out, time, { freq: level === 'accent' ? 3200 : 2600, q: 2.5, peak: 0.9, decay: 0.03 })
      tone(ac, out, time, { freq: level === 'accent' ? 1900 : 1600, peak: 0.25, decay: 0.025 })
    },
  },
  {
    id: 'cowbell',
    name: 'Cowbell',
    family: 'Natural',
    play: (ac, out, time, level) => {
      const f = ac.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 2600
      f.Q.value = 0.8
      f.connect(out)
      const shift = level === 'accent' ? 1.12 : 1
      const decay = level === 'sub' ? 0.08 : 0.18
      for (const freq of [540, 800]) tone(ac, f, time, { type: 'square', freq: freq * shift, peak: 0.4, decay })
    },
  },
  {
    id: 'mechanical',
    name: 'Wind-up metronome',
    family: 'Natural',
    play: (ac, out, time, level) => {
      // A dry wooden "tock" with a tiny bell on the accent, like a pendulum metronome.
      burst(ac, out, time, { freq: 1500, q: 6, peak: 0.8, decay: 0.02 })
      tone(ac, out, time, { freq: 520, peak: 0.25, decay: 0.03 })
      if (level === 'accent') tone(ac, out, time, { type: 'triangle', freq: 2093, peak: 0.25, decay: 0.35 })
    },
  },
  {
    id: 'drums',
    name: 'Drum kit',
    family: 'Natural',
    play: (ac, out, time, level) => {
      if (level === 'accent') {
        tone(ac, out, time, { freq: 120, drop: 0.35, peak: 1, decay: 0.22 })
      } else if (level === 'beat') {
        burst(ac, out, time, { freq: 1800, q: 0.7, peak: 0.55, decay: 0.12 })
        tone(ac, out, time, { type: 'triangle', freq: 190, peak: 0.35, decay: 0.08 })
      }
      burst(ac, out, time, { filter: 'highpass', freq: 7000, peak: level === 'sub' ? 0.45 : 0.25, decay: 0.035 })
    },
  },
  {
    id: 'shaker',
    name: 'Shaker',
    family: 'Natural',
    play: (ac, out, time, level) => burst(ac, out, time, { filter: 'highpass', freq: level === 'accent' ? 4000 : 5500, peak: level === 'accent' ? 0.9 : 0.6, decay: 0.06 }),
  },
  {
    id: 'classic',
    name: 'Classic click',
    family: 'Digital',
    play: (ac, out, time, level) => tone(ac, out, time, { type: 'square', freq: level === 'accent' ? 1760 : level === 'sub' ? 880 : 1100, peak: 0.3, decay: 0.045 }),
  },
  {
    id: 'beep',
    name: 'Beep',
    family: 'Digital',
    play: (ac, out, time, level) => tone(ac, out, time, { freq: level === 'accent' ? 1568 : level === 'sub' ? 784 : 1046.5, peak: 0.6, decay: 0.08, attack: 0.003 }),
  },
  {
    id: 'blip',
    name: 'Blip',
    family: 'Digital',
    play: (ac, out, time, level) => tone(ac, out, time, { type: 'triangle', freq: level === 'accent' ? 2400 : level === 'sub' ? 1200 : 1600, drop: 0.5, peak: 0.6, decay: 0.05 }),
  },
  {
    id: 'tick',
    name: 'Digital tick',
    family: 'Digital',
    play: (ac, out, time, level) => burst(ac, out, time, { filter: 'highpass', freq: level === 'accent' ? 2500 : 4500, peak: 0.9, decay: level === 'accent' ? 0.02 : 0.012 }),
  },
  {
    id: 'electro',
    name: 'Electro rim',
    family: 'Digital',
    play: (ac, out, time, level) => {
      tone(ac, out, time, { type: 'triangle', freq: level === 'accent' ? 1700 : 1350, peak: 0.45, decay: 0.03 })
      tone(ac, out, time, { type: 'square', freq: level === 'accent' ? 520 : 440, drop: 0.7, peak: 0.18, decay: 0.04 })
    },
  },
]

export const SOUND_FAMILIES = [...new Set(CLICK_SOUNDS.map((s) => s.family))]
export const DEFAULT_SOUND = 'woodblock'
export const soundById = (id) => CLICK_SOUNDS.find((s) => s.id === id) ?? CLICK_SOUNDS.find((s) => s.id === DEFAULT_SOUND)

// The sound picked on the Rhythm page is the app's click everywhere (fretboard metronome, drill playback).
export const SOUND_KEY = 'music.clickSound'
export const storedSound = () => {
  try {
    return JSON.parse(window.localStorage.getItem(SOUND_KEY) ?? 'null') ?? DEFAULT_SOUND
  } catch {
    return DEFAULT_SOUND
  }
}

/** Schedule one click at `time` (audio clock). `volume` 0–1 scales the whole sound. */
export function playClickSound(soundId, time, level = 'beat', volume = 0.8) {
  const ac = audioContext()
  if (!ac || level === 'mute' || volume <= 0) return
  const out = ac.createGain()
  out.gain.value = 0.55 * volume * (LEVEL_GAIN[level] ?? 0.7)
  out.connect(ac.destination)
  soundById(soundId).play(ac, out, Math.max(time, ac.currentTime), level)
  // Let the graph go once the sound is over.
  setTimeout(() => out.disconnect(), Math.max(0, (time - ac.currentTime + 1) * 1000))
}

/** Play a short bar of a sound (accent, beat, subdivision, beat) so it can be judged before choosing. */
export const previewSound = (id, volume = 0.8) => {
  const ac = audioContext()
  if (!ac) return
  const t = ac.currentTime + 0.05
  ;['accent', 'sub', 'beat', 'sub'].forEach((level, i) => playClickSound(id, t + i * 0.2, level, volume))
}
