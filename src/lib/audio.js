import { markPracticed } from './practiceLog.js'

// Tiny Web Audio "plucked string" synth so shapes can be heard while practising.
let ctx = null

export const audioContext = () => {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
  }
  if (ctx.state === 'suspended') ctx.resume()
  // Every sound goes through here, so playing anything marks today as a practice day.
  markPracticed()
  return ctx
}

export const midiToFrequency = (pitch) => 440 * 2 ** ((pitch - 69) / 12)

// Returns a function that cuts the note short.
export function playPitch(pitch, delay = 0, duration = 1.4, volume = 0.18) {
  const ac = audioContext()
  if (!ac) return () => {}
  const start = ac.currentTime + delay
  const osc = ac.createOscillator()
  const filter = ac.createBiquadFilter()
  const gain = ac.createGain()
  osc.type = 'sawtooth'
  osc.frequency.value = midiToFrequency(pitch)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(3000, start)
  filter.frequency.exponentialRampToValueAtTime(400, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(filter).connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
  return () => {
    const now = ac.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
    try {
      osc.stop(now + 0.06)
    } catch {
      // Already stopped.
    }
  }
}

// Strum several pitches (low to high) like a chord.
export const playChord = (pitches, delay = 0) =>
  [...pitches].sort((a, b) => a - b).forEach((p, i) => playPitch(p, delay + i * 0.035, 2))

// Short metronome tick; accented beats are higher and louder.
export function playClick(time, accent = false) {
  const ac = audioContext()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'square'
  osc.frequency.value = accent ? 1760 : 1100
  gain.gain.setValueAtTime(accent ? 0.25 : 0.15, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
  osc.connect(gain).connect(ac.destination)
  osc.start(time)
  osc.stop(time + 0.06)
}

// Calls `onBeat(beatIndex)` and clicks in time, scheduling slightly ahead so the beat stays steady. Returns a stop function.
export function startMetronome(bpm, beatsPerBar = 4, onBeat) {
  const ac = audioContext()
  if (!ac) return () => {}
  const interval = 60 / bpm
  let next = ac.currentTime + 0.05
  let beat = 0
  const tick = () => {
    while (next < ac.currentTime + 0.1) {
      const index = beat % beatsPerBar
      playClick(next, index === 0)
      setTimeout(() => onBeat?.(index), Math.max(0, (next - ac.currentTime) * 1000))
      next += interval
      beat++
    }
  }
  tick()
  const timer = setInterval(tick, 25)
  return () => clearInterval(timer)
}

// Holds a soft note (and its octave) until the returned stop function is called.
export function startDrone(pitch) {
  const ac = audioContext()
  if (!ac) return () => {}
  const gain = ac.createGain()
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  gain.gain.setValueAtTime(0.0001, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.08, ac.currentTime + 0.4)
  const oscs = [pitch, pitch + 12].map((p) => {
    const osc = ac.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = midiToFrequency(p)
    osc.connect(filter)
    osc.start()
    return osc
  })
  filter.connect(gain).connect(ac.destination)
  return () => {
    const end = ac.currentTime + 0.3
    gain.gain.cancelScheduledValues(ac.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    oscs.forEach((o) => o.stop(end + 0.05))
  }
}
