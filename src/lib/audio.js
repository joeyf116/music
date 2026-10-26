// Tiny Web Audio "plucked string" synth so shapes can be heard while practising.
let ctx = null

const audioContext = () => {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export const midiToFrequency = (pitch) => 440 * 2 ** ((pitch - 69) / 12)

export function playPitch(pitch, delay = 0, duration = 1.4) {
  const ac = audioContext()
  if (!ac) return
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
  gain.gain.exponentialRampToValueAtTime(0.18, start + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(filter).connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

// Strum several pitches (low to high) like a chord.
export const playChord = (pitches, delay = 0) =>
  [...pitches].sort((a, b) => a - b).forEach((p, i) => playPitch(p, delay + i * 0.035, 2))
