// Web Audio backing band for the Charts page: synthesized drums, bass and piano that play a compiled
// chart (see chart.js compileChart) in a chosen style (see arranger.js). Notes are scheduled a bar
// ahead on the audio clock so timing stays steady even when the page is busy.
import { audioContext, midiToFrequency } from './audio.js'
import { bassNotes, compHits, drumHits, STYLES, swingTime, voiceChord } from './arranger.js'

export const CHANNELS = ['drums', 'bass', 'piano']

let noise = null

const noiseBuffer = (ac) => {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noise
}

const envelope = (ac, out, time, peak, decay, attack = 0.002) => {
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay)
  gain.connect(out)
  return gain
}

const noiseHit = (ac, out, time, { peak, decay, type, frequency, q = 1, attack }) => {
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac)
  const filter = ac.createBiquadFilter()
  filter.type = type
  filter.frequency.value = frequency
  filter.Q.value = q
  src.connect(filter).connect(envelope(ac, out, time, peak, decay, attack))
  src.start(time, Math.random() * 0.5)
  src.stop(time + decay + 0.1)
}

const toneHit = (ac, out, time, { peak, decay, type = 'sine', from, to = from }) => {
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(from, time)
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, time + decay * 0.6)
  osc.connect(envelope(ac, out, time, peak, decay))
  osc.start(time)
  osc.stop(time + decay + 0.05)
}

const DRUMS = {
  kick: (ac, out, t, v) => toneHit(ac, out, t, { peak: 0.9 * v, decay: 0.32, from: 150, to: 45 }),
  snare: (ac, out, t, v) => {
    noiseHit(ac, out, t, { peak: 0.45 * v, decay: 0.16, type: 'bandpass', frequency: 1900, q: 0.7 })
    toneHit(ac, out, t, { peak: 0.25 * v, decay: 0.08, type: 'triangle', from: 220, to: 160 })
  },
  hat: (ac, out, t, v) => noiseHit(ac, out, t, { peak: 0.16 * v, decay: 0.045, type: 'highpass', frequency: 7500 }),
  hatFoot: (ac, out, t, v) => noiseHit(ac, out, t, { peak: 0.12 * v, decay: 0.035, type: 'highpass', frequency: 6000 }),
  ride: (ac, out, t, v) => {
    noiseHit(ac, out, t, { peak: 0.09 * v, decay: 0.45, type: 'bandpass', frequency: 8500, q: 1.5 })
    toneHit(ac, out, t, { peak: 0.025 * v, decay: 0.4, type: 'square', from: 3150 })
  },
  rim: (ac, out, t, v) => {
    toneHit(ac, out, t, { peak: 0.2 * v, decay: 0.03, type: 'triangle', from: 1700 })
    noiseHit(ac, out, t, { peak: 0.12 * v, decay: 0.025, type: 'bandpass', frequency: 3200, q: 2 })
  },
  brush: (ac, out, t, v) => noiseHit(ac, out, t, { peak: 0.1 * v, decay: 0.22, type: 'bandpass', frequency: 3500, q: 0.6, attack: 0.02 }),
  stick: (ac, out, t, v) => toneHit(ac, out, t, { peak: 0.3 * v, decay: 0.04, type: 'square', from: 2400 }),
}

const playBass = (ac, out, time, length, pitch, velocity) => {
  const end = time + length
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.5 * velocity, time + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.25 * velocity, time + Math.min(0.25, length))
  gain.gain.setValueAtTime(0.25 * velocity, Math.max(time + 0.01, end - 0.06))
  gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.04)
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1200, time)
  filter.frequency.exponentialRampToValueAtTime(350, time + 0.2)
  filter.connect(gain).connect(out)
  for (const [type, level] of [['sawtooth', 0.6], ['sine', 1]]) {
    const osc = ac.createOscillator()
    const mix = ac.createGain()
    osc.type = type
    osc.frequency.value = midiToFrequency(pitch)
    mix.gain.value = level
    osc.connect(mix).connect(filter)
    osc.start(time)
    osc.stop(end + 0.1)
  }
}

const playPiano = (ac, out, time, length, pitches, velocity) => {
  const end = time + length
  const level = (0.16 * velocity) / Math.sqrt(pitches.length)
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 2600
  filter.connect(out)
  pitches.forEach((pitch, i) => {
    const start = time + i * 0.006
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(level, start + 0.006)
    gain.gain.exponentialRampToValueAtTime(level * 0.45, start + Math.min(0.6, length))
    gain.gain.setValueAtTime(level * 0.45, Math.max(start + 0.01, end - 0.05))
    gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.25)
    gain.connect(filter)
    for (const [type, mult, amount] of [['triangle', 1, 1], ['sine', 2, 0.35]]) {
      const osc = ac.createOscillator()
      const mix = ac.createGain()
      osc.type = type
      osc.frequency.value = midiToFrequency(pitch) * mult
      mix.gain.value = amount
      osc.connect(mix).connect(gain)
      osc.start(start)
      osc.stop(end + 0.3)
    }
  })
}

/**
 * Plays `song` ({ beats, bars } from compileChart). Options: bpm, style, volumes { drums, bass, piano },
 * countIn, loop, startBar, onBar(index | 'count', beat), onEnd. Returns { stop, setVolumes, setTempo }.
 */
export function playBand(song, options) {
  const ac = audioContext()
  if (!ac || !song.bars.length) return { stop() {}, setVolumes() {}, setTempo() {} }
  let bpm = options.bpm
  const style = STYLES[options.style] ?? STYLES.swing
  const bus = ac.createGain()
  bus.connect(ac.destination)
  const channels = Object.fromEntries(
    CHANNELS.map((name) => {
      const gain = ac.createGain()
      gain.connect(bus)
      return [name, gain]
    }),
  )
  const setVolumes = (volumes) => CHANNELS.forEach((name) => channels[name].gain.setTargetAtTime(volumes[name] ?? 1, ac.currentTime, 0.02))
  setVolumes(options.volumes ?? {})

  const timers = new Set()
  const later = (time, fn) => {
    const id = setTimeout(() => (timers.delete(id), fn()), Math.max(0, (time - ac.currentTime) * 1000))
    timers.add(id)
  }
  const state = {}
  let voicing = null
  let next = ac.currentTime + 0.08
  let bar = Math.min(options.startBar ?? 0, song.bars.length - 1)
  let counting = options.countIn ? 1 : 0
  let played = 0
  let done = false

  const scheduleBar = (time) => {
    const beat = 60 / bpm
    const at = (t) => time + swingTime(t, style.swing) * beat
    if (counting) {
      for (let b = 0; b < song.beats; b++) {
        DRUMS.stick(ac, channels.drums, time + b * beat, b === 0 ? 1 : 0.7)
        later(time + b * beat, () => options.onBar?.('count', b))
      }
      counting--
      return
    }
    const current = song.bars[bar]
    const nextBar = song.bars[bar + 1] ?? (options.loop ? song.bars[0] : null)
    const nextChord = nextBar?.events[0]?.chord ?? null
    for (const hit of drumHits(options.style, song.beats, played)) DRUMS[hit.voice]?.(ac, channels.drums, time + hit.time * beat, hit.velocity)
    for (const n of bassNotes(options.style, current.events, song.beats, nextChord, state)) playBass(ac, channels.bass, at(n.time), n.length * beat * 0.95, n.pitch, n.velocity)
    for (const h of compHits(options.style, current.events, song.beats, played)) {
      voicing = voiceChord(h.chord, voicing)
      playPiano(ac, channels.piano, at(h.time), h.length * beat, voicing, h.velocity)
    }
    const index = bar
    later(time, () => options.onBar?.(index, 0))
    played++
    bar++
    if (bar >= song.bars.length) {
      if (options.loop) bar = 0
      else {
        done = true
        later(time + song.beats * beat, () => options.onEnd?.())
      }
    }
  }

  const tick = () => {
    while (!done && next < ac.currentTime + 0.25) {
      const length = song.beats * (60 / bpm)
      scheduleBar(next)
      next += length
    }
  }
  tick()
  const timer = setInterval(tick, 50)

  return {
    stop() {
      clearInterval(timer)
      timers.forEach(clearTimeout)
      timers.clear()
      done = true
      bus.gain.setTargetAtTime(0, ac.currentTime, 0.03)
      setTimeout(() => bus.disconnect(), 400)
    },
    setVolumes,
    setTempo(value) {
      bpm = value
    },
  }
}
