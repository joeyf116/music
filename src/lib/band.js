// Web Audio backing band for the Charts page: a recorded grand piano, upright or electric bass and a jazz club
// drum kit (see bandSamples.js and scripts/build-band-samples.py) playing a compiled chart (see chart.js
// compileChart) in a chosen style (see arranger.js), through a little room reverb. Notes are scheduled a bar
// ahead on the audio clock so timing stays steady even when the page is busy. Until the recordings have
// loaded (or if they can't be), the band falls back to simple synthesized instruments.
import { audioContext, midiToFrequency } from './audio.js'
import { bassNotes, compHits, drumHits, STYLES, swingTime, voiceChord } from './arranger.js'
import { BAND_SAMPLES } from './bandSamples.js'

export const CHANNELS = ['drums', 'bass', 'piano']

// ---- Recorded instruments ----

// Where the recordings are served from: next to the web page, or set by the app (mobile) at start-up.
let sampleUrl = typeof document !== 'undefined' && document.baseURI ? new URL('samples/band/', document.baseURI).href : null
export const setBandSampleUrl = (url) => {
  sampleUrl = url
}

const buffers = new Map() // file -> { buffer, offset }
let loading = null
let loaded = false

const fill = (pattern, values) => pattern.replace(/\{(\w+)\}/g, (_, k) => values[k])
const instrumentFiles = (instrument) =>
  instrument.layers.flatMap((layer) => layer.notes.flatMap((note) => (layer.rr ?? ['']).map((rr) => fill(layer.file, { note, rr }))))
const allFiles = () => [
  ...Object.values(BAND_SAMPLES.drums).flatMap((hits) => hits.map((h) => h.file)),
  ...instrumentFiles(BAND_SAMPLES.upright),
  ...instrumentFiles(BAND_SAMPLES.electric),
  ...instrumentFiles(BAND_SAMPLES.piano),
]

// Where the sound starts in a decoded file (MP3 decoders can add a few milliseconds of silence up front).
const onset = (buffer) => {
  const data = buffer.getChannelData(0)
  const n = Math.min(data.length, Math.floor(buffer.sampleRate * 0.3))
  let peak = 0
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i]))
  for (let i = 0; i < n; i++) if (Math.abs(data[i]) > peak * 0.03) return Math.max(0, i / buffer.sampleRate - 0.001)
  return 0
}

/** True once every recording is decoded and ready. */
export const bandLoaded = () => loaded

/**
 * Downloads and decodes the band's recordings (about 3.6 MB, once per visit). Safe to call often: later calls
 * share the first one. Resolves true when ready, false if they can't be loaded (the band then uses its synths).
 */
export function loadBand(ac = audioContext()) {
  if (loading) return loading
  if (!ac || !sampleUrl || typeof fetch !== 'function') return Promise.resolve(false)
  const files = allFiles().filter((f) => !buffers.has(f))
  let next = 0
  const worker = async () => {
    while (next < files.length) {
      const file = files[next++]
      const response = await fetch(sampleUrl + file)
      if (!response.ok) throw new Error(`${file}: ${response.status}`)
      const buffer = await ac.decodeAudioData(await response.arrayBuffer())
      buffers.set(file, { buffer, offset: onset(buffer) })
    }
  }
  loading = Promise.all(Array.from({ length: 6 }, worker)).then(
    () => (loaded = true),
    (error) => {
      console.warn('Backing band recordings could not be loaded; using synthesized instruments.', error)
      loading = null // try again next time
      return false
    },
  )
  return loading
}

/**
 * Plays one recording at `time`: `rate` repitches it, `hold` (seconds) lets it ring that long before a
 * `release` fade, otherwise it plays out. Returns the gain node (so it can be cut short) or null.
 */
const playSample = (ac, out, file, time, { rate = 1, gain = 1, hold = null, release = 0.12 } = {}) => {
  const entry = buffers.get(file)
  if (!entry) return null
  const start = Math.max(time, ac.currentTime)
  const src = ac.createBufferSource()
  src.buffer = entry.buffer
  if (rate !== 1) src.playbackRate.value = rate
  const level = ac.createGain()
  level.gain.setValueAtTime(gain, start)
  src.connect(level).connect(out)
  let end = start + (entry.buffer.duration - entry.offset) / rate
  if (hold !== null && start + hold + release < end) {
    level.gain.setValueAtTime(gain, start + hold)
    level.gain.setTargetAtTime(0, start + hold, release / 4)
    end = start + hold + release
  }
  src.start(start, entry.offset)
  src.stop(end + 0.02)
  return level
}

// The recording nearest `pitch` in the layer for `velocity`, and how far to repitch it.
const zone = (instrument, pitch, velocity, rand) => {
  const layer = [...instrument.layers].reverse().find((l) => velocity >= l.velocity) ?? instrument.layers[0]
  const note = layer.notes.reduce((a, b) => (Math.abs(b - pitch) < Math.abs(a - pitch) ? b : a))
  const rr = layer.rr ? layer.rr[Math.floor(rand() * layer.rr.length)] : ''
  return { file: fill(layer.file, { note, rr }), rate: 2 ** ((pitch - note) / 12) }
}

// How loud each drum sits in the kit, and in which recording: the hit whose own loudness is nearest the one
// wanted (round-robining between near-equals), then trimmed with gain.
const DRUM_MIX = { kick: 2.4, snare: 1.8, ghost: 2.1, rim: 1.9, ride: 2.2, bell: 1.4, hat: 1.3, hatHalf: 1.1, hatOpen: 1.1, hatFoot: 1.9, crash: 1.1, tomHigh: 1.8, tomLow: 1.9 }
const DRUM_STANDINS = { brush: 'hat', stick: 'rim' }
const drumSample = (voice, velocity, rand) => {
  const hits = BAND_SAMPLES.drums[voice] ?? BAND_SAMPLES.drums[DRUM_STANDINS[voice]]
  if (!hits) return null
  const want = Math.max(0.01, velocity * velocity)
  const distance = (h) => Math.abs(Math.log(h.level / want))
  const best = Math.min(...hits.map(distance))
  const near = hits.filter((h) => distance(h) <= best + 0.2)
  const hit = near[Math.floor(rand() * near.length)]
  return { file: hit.file, gain: Math.min(1.6, Math.max(0.3, want / hit.level)) * (DRUM_MIX[voice] ?? DRUM_MIX[DRUM_STANDINS[voice]] ?? 0.6) }
}

const BASS_LEVEL = { upright: 0.7, electric: 0.5 }

const SAMPLED = {
  drum(ac, out, time, voice, velocity, rand, kit) {
    const pick = drumSample(voice, velocity, rand)
    if (!pick) return
    // A closing hi-hat chokes an open one.
    if ((voice === 'hat' || voice === 'hatFoot') && kit.openHat) {
      const { node, gain } = kit.openHat
      const at = Math.max(time, ac.currentTime)
      node?.gain.setValueAtTime(gain, at)
      node?.gain.linearRampToValueAtTime(0, at + 0.03)
      kit.openHat = null
    }
    const node = playSample(ac, out, pick.file, time, { gain: pick.gain })
    if (voice === 'hatOpen' || voice === 'hatHalf') kit.openHat = { node, gain: pick.gain }
  },
  bass(ac, out, time, length, pitch, velocity, rand, sound) {
    const { file, rate } = zone(BAND_SAMPLES[sound] ?? BAND_SAMPLES.upright, pitch, velocity, rand)
    playSample(ac, out, file, time, { rate, gain: BASS_LEVEL[sound] * (0.55 + 0.6 * velocity), hold: length, release: sound === 'electric' ? 0.06 : 0.1 })
  },
  piano(ac, out, time, length, pitches, velocity, rand) {
    const level = (0.24 + 0.2 * velocity) / Math.sqrt(Math.max(3, pitches.length) / 3)
    // Fingers never land at quite the same moment: a few milliseconds between notes, lowest first.
    const spread = length > 2 ? 0.018 : 0.006
    pitches.forEach((pitch, i) => {
      const v = Math.min(1, Math.max(0.1, velocity + (rand() - 0.5) * 0.1))
      const { file, rate } = zone(BAND_SAMPLES.piano, pitch, v, rand)
      playSample(ac, out, file, time + i * spread + rand() * 0.004, { rate, gain: level * (0.8 + 0.4 * v), hold: Math.max(0.12, length), release: 0.25 })
    })
  },
}

// ---- Synthesized stand-ins (used until the recordings load) ----

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

const SYNTH_DRUMS = {
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
  tomHigh: (ac, out, t, v) => toneHit(ac, out, t, { peak: 0.5 * v, decay: 0.25, from: 220, to: 160 }),
  tomLow: (ac, out, t, v) => toneHit(ac, out, t, { peak: 0.55 * v, decay: 0.3, from: 150, to: 100 }),
}
Object.assign(SYNTH_DRUMS, { ghost: SYNTH_DRUMS.snare, bell: SYNTH_DRUMS.ride, crash: SYNTH_DRUMS.ride, hatOpen: SYNTH_DRUMS.hat, hatHalf: SYNTH_DRUMS.hat })

const SYNTH = {
  drum(ac, out, time, voice, velocity) {
    SYNTH_DRUMS[voice]?.(ac, out, Math.max(time, ac.currentTime), velocity)
  },
  bass(ac, out, time, length, pitch, velocity) {
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
  },
  piano(ac, out, time, length, pitches, velocity) {
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
  },
}

// ---- The room ----

const rooms = new WeakMap()
// A small, warm room: a second or so of decaying stereo noise, darker as it fades.
const roomImpulse = (ac) => {
  if (rooms.has(ac)) return rooms.get(ac)
  const rate = ac.sampleRate
  const length = Math.floor(rate * 1.6)
  const impulse = ac.createBuffer(2, length, rate)
  for (let c = 0; c < 2; c++) {
    const data = new Float32Array(length)
    let smooth = 0
    for (let i = 0; i < length; i++) {
      const t = i / rate
      const darkness = Math.min(0.92, 0.35 + t * 0.6)
      smooth = smooth * darkness + (Math.random() * 2 - 1) * (1 - darkness)
      data[i] = smooth * Math.exp(-t / 0.32) * (t < 0.012 ? t / 0.012 : 1)
    }
    impulse.copyToChannel(data, c)
  }
  rooms.set(ac, impulse)
  return impulse
}

const REVERB_SEND = { drums: 0.12, bass: 0.05, piano: 0.22 }
const PAN = { drums: 0, bass: 0, piano: 0.12 }

// Channel faders → (pan, reverb send) → a gentle bus compressor → speakers. Returns { bus, channels }.
export const createBandMixer = (ac) => {
  const bus = ac.createGain()
  bus.gain.value = 0.45
  let master = bus
  if (typeof ac.createDynamicsCompressor === 'function') {
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -20
    comp.knee.value = 12
    comp.ratio.value = 3
    comp.attack.value = 0.005
    comp.release.value = 0.2
    bus.connect(comp)
    master = comp
  }
  // A fast limiter last, so a crash on a loud downbeat never clips.
  if (typeof ac.createDynamicsCompressor === 'function') {
    const limiter = ac.createDynamicsCompressor()
    limiter.threshold.value = -2
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.001
    limiter.release.value = 0.08
    master.connect(limiter)
    master = limiter
  }
  master.connect(ac.destination)
  let reverb = null
  if (typeof ac.createConvolver === 'function') {
    try {
      reverb = ac.createConvolver()
      reverb.buffer = roomImpulse(ac)
      const wet = ac.createGain()
      wet.gain.value = 0.9
      reverb.connect(wet).connect(bus)
    } catch {
      reverb = null
    }
  }
  const channels = Object.fromEntries(
    CHANNELS.map((name) => {
      const fader = ac.createGain()
      let out = fader
      if (PAN[name] && typeof ac.createStereoPanner === 'function') {
        const pan = ac.createStereoPanner()
        pan.pan.value = PAN[name]
        fader.connect(pan)
        out = pan
      }
      out.connect(bus)
      if (reverb) {
        const send = ac.createGain()
        send.gain.value = REVERB_SEND[name]
        out.connect(send).connect(reverb)
      }
      return [name, fader]
    }),
  )
  return { bus, channels }
}

// ---- Playing a song ----

/**
 * Schedules a song bar by bar into `channels` ({ drums, bass, piano } audio nodes). `scheduleBar(time)` plays the
 * next bar (or count-in bar) at `time` and returns its length in seconds, or null when the song is over.
 * Shared by playBand and offline rendering.
 */
export function bandScheduler(ac, channels, song, options) {
  const style = STYLES[options.style] ?? STYLES.swing
  const rand = options.random ?? Math.random
  const sound = options.sampled ? SAMPLED : SYNTH
  const kit = {}
  const bassState = {}
  const compState = {}
  let voicing = null
  let bar = Math.min(options.startBar ?? 0, song.bars.length - 1)
  let counting = options.countIn ? 1 : 0
  let played = 0
  const humanize = (ms) => ((rand() * 2 - 1) * ms) / 1000

  return function scheduleBar(time, bpm, notify = () => {}) {
    const beat = 60 / bpm
    const at = (t) => time + swingTime(t, style.swing) * beat
    if (counting) {
      for (let b = 0; b < song.beats; b++) {
        sound.drum(ac, channels.drums, time + b * beat, 'rim', b === 0 ? 0.85 : 0.65, rand, kit)
        notify(time + b * beat, 'count', b)
      }
      counting--
      return song.beats * beat
    }
    if (bar >= song.bars.length) return null
    const current = song.bars[bar]
    const nextBar = song.bars[bar + 1] ?? (options.loop ? song.bars[0] : null)
    const nextChord = nextBar?.events[0]?.chord ?? null
    const previousBar = played > 0 ? song.bars[bar - 1] ?? song.bars.at(-1) : null
    const sectionStart = !previousBar || previousBar.section !== current.section || bar === 0
    const sectionEnd = nextBar && (nextBar.section !== current.section || bar === song.bars.length - 1)
    const drums = drumHits(options.style, song.beats, played, { fill: Boolean(sectionEnd) && played > 0, crash: sectionStart && played > 0 }, rand)
    for (const hit of drums) {
      const v = Math.min(1, hit.velocity * (0.9 + rand() * 0.2))
      sound.drum(ac, channels.drums, time + hit.time * beat + humanize(4), hit.voice, v, rand, kit)
    }
    for (const n of bassNotes(options.style, current.events, song.beats, nextChord, bassState, rand))
      sound.bass(ac, channels.bass, at(n.time) + humanize(5), n.length * beat * 0.97, n.pitch, n.velocity, rand, style.bassSound)
    for (const h of compHits(options.style, current.events, song.beats, played, rand, nextChord, compState)) {
      voicing = voiceChord(h.chord, voicing, style.voicing)
      sound.piano(ac, channels.piano, at(h.time) + humanize(8), h.length * beat, voicing, h.velocity, rand)
    }
    notify(time, bar, 0)
    played++
    bar++
    if (bar >= song.bars.length && options.loop) bar = 0
    return song.beats * beat
  }
}

/**
 * Plays `song` ({ beats, bars } from compileChart). Options: bpm, style, volumes { drums, bass, piano },
 * countIn, loop, startBar, onBar(index | 'count', beat), onEnd, onLoading(boolean) (called while the recorded
 * instruments download, which only happens the first time). Returns { stop, setVolumes, setTempo }.
 */
export function playBand(song, options) {
  const ac = audioContext()
  if (!ac || !song.bars.length) return { stop() {}, setVolumes() {}, setTempo() {} }
  let bpm = options.bpm
  const { bus, channels } = createBandMixer(ac)
  const setVolumes = (volumes) => CHANNELS.forEach((name) => channels[name].gain.setTargetAtTime(volumes[name] ?? 1, ac.currentTime, 0.02))
  setVolumes(options.volumes ?? {})

  const timers = new Set()
  const later = (time, fn) => {
    const id = setTimeout(() => (timers.delete(id), fn()), Math.max(0, (time - ac.currentTime) * 1000))
    timers.add(id)
  }
  let stopped = false
  let interval = null

  const begin = (sampled) => {
    if (stopped) return
    const scheduleBar = bandScheduler(ac, channels, song, { ...options, sampled })
    const notify = (time, bar, beat) => later(time, () => options.onBar?.(bar, beat))
    let next = ac.currentTime + 0.1
    let done = false
    const tick = () => {
      while (!done && next < ac.currentTime + 0.3) {
        const length = scheduleBar(next, bpm, notify)
        if (length === null) {
          done = true
          later(next, () => options.onEnd?.())
        } else next += length
      }
    }
    tick()
    interval = setInterval(tick, 50)
  }

  if (loaded) begin(true)
  else {
    options.onLoading?.(true)
    // Give the recordings a while to arrive (they are usually prefetched when the chart opens), then play
    // with whatever is available.
    const timeout = new Promise((resolve) => setTimeout(() => resolve(false), 15000))
    Promise.race([loadBand(), timeout]).then((ok) => {
      if (stopped) return
      options.onLoading?.(false)
      begin(ok)
    })
  }

  return {
    stop() {
      stopped = true
      clearInterval(interval)
      timers.forEach(clearTimeout)
      timers.clear()
      bus.gain.setTargetAtTime(0, ac.currentTime, 0.03)
      setTimeout(() => bus.disconnect(), 400)
    },
    setVolumes,
    setTempo(value) {
      bpm = value
    },
  }
}
