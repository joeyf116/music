// Plays drum loops on recorded kits. Hits are scheduled a little ahead on the Web Audio clock (like the
// metronome), so the groove stays tight when the page is busy, and the playhead follows the same clock.
// Each hit picks the recorded layer closest to how hard it is played and rotates through the round-robin
// takes, so repeated notes sound like a drummer and not a machine.
import { audioContext } from './audio.js'
import { KIT_SAMPLES } from './drumKits.js'
import { CHOKES, hitsAt, stepCount, stepSeconds, stepsPerBar, swingDelay } from './drumLoops.js'

const LOOKAHEAD = 0.12

/** Audio-clock time that is reaching the listener's ears right now (for the playhead). */
const heardNow = (ac) => ac.currentTime - (ac.outputLatency || 0) - (ac.baseLatency || 0)

/**
 * The kits, each recorded from a real drum set. `borrow` is the kit whose cymbals or drums fill in for one
 * this kit wasn't recorded with (the lo-fi kit has no cymbals, so it uses the jazz kit's softer ones).
 */
export const KITS = [
  { id: 'rock', name: 'Rock', detail: 'big, open 1980s kit', credit: 'Big Rusty Drums by Karoryfer Samples' },
  { id: 'jazz', name: 'Jazz', detail: 'small club kit, sticks', credit: 'Virtuosity Drums by Versilian Studios', borrow: 'rock' },
  { id: 'brushes', name: 'Brushes', detail: 'soft kit played with brushes', credit: 'Swirly Drums by Karoryfer Samples', borrow: 'jazz' },
  { id: 'lofi', name: 'Lo-fi', detail: 'dusty kit through a vintage mic', credit: 'Gogodze Phu Vol II by Karoryfer Samples', borrow: 'jazz' },
]

export const kitById = (id) => KITS.find((k) => k.id === id) ?? KITS[0]

/** Hand percussion is one shared set, recorded with Virtuosity Drums. */
const PERC_KIT = 'perc'
export const PERC_CREDIT = 'Virtuosity Drums by Versilian Studios'

/** The nearest drum on the same kit when a kit has no recording of one (a mid tom becomes the high tom). */
const STAND_INS = { tomMid: ['tomHigh', 'tomLow'], tomLow: ['tomFloor', 'tomMid'], sidestick: ['rimshot'], rideBell: ['ride'], hihatPedal: ['hihat'] }

/**
 * Which recording plays a drum on a kit: { kit, voice }. Hand percussion always uses the shared set; a drum
 * the kit lacks is played by a stand-in on the same kit, then by the borrowed kit, then by the rock kit.
 * Null when nothing fits.
 */
export function resolveSample(kit, voice) {
  if (KIT_SAMPLES[kit]?.[voice]) return { kit, voice }
  if (KIT_SAMPLES[PERC_KIT]?.[voice]) return { kit: PERC_KIT, voice }
  for (const alt of STAND_INS[voice] ?? []) if (KIT_SAMPLES[kit]?.[alt]) return { kit, voice: alt }
  const borrow = KITS.find((k) => k.id === kit)?.borrow ?? 'rock'
  for (const other of [borrow, 'rock']) if (other !== kit && KIT_SAMPLES[other]?.[voice]) return { kit: other, voice }
  return null
}

const sampleUrl = (kit, voice, layer, take) => `${import.meta.env.BASE_URL}samples/drums/${kit}/${voice}-${layer}-${take}.mp3`

// kit -> voice -> { promise, buffers } where buffers is [layer][take] AudioBuffers once loaded
const cache = new Map()

function loadVoice(ac, kit, voice) {
  const spec = KIT_SAMPLES[kit]?.[voice]
  if (!spec) return Promise.resolve()
  if (!cache.has(kit)) cache.set(kit, new Map())
  const voices = cache.get(kit)
  if (!voices.has(voice)) {
    const entry = { buffers: null }
    entry.promise = Promise.all(
      spec.layers.map((_, l) =>
        Promise.all(
          Array.from({ length: spec.rr }, (_, t) =>
            fetch(sampleUrl(kit, voice, l + 1, t + 1))
              .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`Drum sample ${r.status}`))))
              .then((data) => ac.decodeAudioData(data)),
          ),
        ),
      ),
    ).then(
      (buffers) => {
        entry.buffers = buffers
      },
      (err) => {
        voices.delete(voice) // let a later attempt retry (e.g. after going back online)
        throw err
      },
    )
    voices.set(voice, entry)
  }
  return voices.get(voice).promise
}

/** Loads the given drums of a kit (all of them when `voices` is left out). Resolves when they can play. */
export function loadKit(kit, voices = Object.keys(KIT_SAMPLES[kit] ?? {})) {
  const ac = audioContext()
  if (!ac) return Promise.resolve()
  return Promise.all(
    voices.map((v) => {
      const at = resolveSample(kit, v)
      return at ? loadVoice(ac, at.kit, at.voice) : undefined
    }),
  ).then(() => undefined)
}

/** The voices a loop uses, for loading just what it needs first. */
export const loopVoices = (loop) => Object.keys(loop.tracks)

/** Picks the recorded layer whose loudness is closest to the velocity, and a gain to make up the difference. */
export function pickLayer(layers, velocity) {
  let best = 0
  layers.forEach((level, i) => {
    if (Math.abs(level - velocity) < Math.abs(layers[best] - velocity)) best = i
  })
  const gain = Math.min(1.4, Math.max(0.6, velocity / layers[best]))
  return { layer: best, gain }
}

let output = null
function outputBus(ac) {
  if (output?.context === ac) return output
  // A gentle bus compressor glues the kit together the way a mix engineer would, without pumping.
  const comp = ac.createDynamicsCompressor()
  comp.threshold.value = -12
  comp.knee.value = 8
  comp.ratio.value = 2.5
  comp.attack.value = 0.008
  comp.release.value = 0.18
  const gain = ac.createGain()
  gain.connect(comp).connect(ac.destination)
  output = { context: ac, input: gain, gain }
  return output
}

const takeCounters = new Map()
const ringing = [] // open hats that a closed hat can choke: { voice, gain, source, start }

/**
 * A drummer's small variations: up to 10 ms late and ±12% in loudness at full humanize (0-1). Hits are
 * only ever pushed later, never earlier than the grid, so nothing is scheduled in the past.
 */
export function humanizeHit(amount, random = Math.random) {
  if (!amount) return { time: 0, velocity: 1 }
  return { time: random() * 0.01 * amount, velocity: 1 + (random() * 2 - 1) * 0.12 * amount }
}

/** Plays one drum hit at an audio-clock time. Returns false if that drum isn't loaded yet. */
export function playDrum(kit, voice, velocity, time, volume = 1) {
  const ac = audioContext()
  if (!ac) return false
  const at = resolveSample(kit, voice)
  const spec = at && KIT_SAMPLES[at.kit][at.voice]
  const buffers = at && cache.get(at.kit)?.get(at.voice)?.buffers
  if (!spec || !buffers) return false
  const { layer, gain } = pickLayer(spec.layers, velocity)
  const key = `${at.kit}:${at.voice}:${layer}`
  const take = ((takeCounters.get(key) ?? -1) + 1) % spec.rr
  takeCounters.set(key, take)

  for (const target of CHOKES[voice] ?? []) {
    for (let i = ringing.length - 1; i >= 0; i--) {
      const r = ringing[i]
      if (r.voice !== target || r.start >= time) continue
      r.gain.gain.setTargetAtTime(0, time, 0.012)
      try {
        r.source.stop(time + 0.1)
      } catch {
        // Already stopped.
      }
      ringing.splice(i, 1)
    }
  }

  const source = ac.createBufferSource()
  source.buffer = buffers[layer][take]
  const amp = ac.createGain()
  amp.gain.value = gain * volume
  source.connect(amp).connect(outputBus(ac).input)
  source.start(Math.max(time, ac.currentTime))
  if (Object.values(CHOKES).some((targets) => targets.includes(voice))) {
    const entry = { voice, gain: amp, source, start: time }
    ringing.push(entry)
    source.onended = () => {
      const i = ringing.indexOf(entry)
      if (i >= 0) ringing.splice(i, 1)
    }
  }
  return true
}

/** Recorded sounds the click over a groove can use (real hand percussion, not a synthesised beep). */
export const CLICKS = [
  { value: 'claves', label: 'Claves' },
  { value: 'cowbell', label: 'Cowbell' },
  { value: 'sidestick', label: 'Side stick' },
]

/** The click heard on a step when the click is on: the first beat of each bar accented, other beats plain. */
export function clickAt(loop, step) {
  const inBar = step % stepsPerBar(loop)
  if (inBar % loop.steps) return null
  return inBar === 0 ? 'accent' : 'beat'
}

/**
 * Loads what the loop needs, then plays it until stopped.
 * `settings`: { loop, kit, bpm, volume, humanize, click } where click is a recorded drum (CLICKS) played on
 * every beat over the groove, or null.
 * onStep(step) fires as each step is heard (for the playhead). Settings can change while it plays and take
 * effect from the next step, so tempo changes never jump. Returns { stop, update(settings), loaded }.
 */
export function startDrumLoop(settings, { onStep } = {}) {
  const ac = audioContext()
  if (!ac) return { stop: () => {}, update: () => {}, loaded: Promise.resolve() }
  let opts = settings
  let stopped = false
  let timer = 0
  let frame = 0
  const visuals = []
  let step = 0
  let gridTime = 0

  const schedule = () => {
    const { loop, kit, bpm, volume = 1, humanize = 0, click = null } = opts
    const n = stepCount(loop)
    while (gridTime <= ac.currentTime + LOOKAHEAD) {
      step %= n
      const time = gridTime + swingDelay(loop, bpm, loop.swing, step)
      for (const hit of hitsAt(loop, step)) {
        const feel = humanizeHit(humanize)
        playDrum(kit, hit.voice, Math.min(1, hit.velocity * feel.velocity), time + feel.time, volume * hit.volume)
      }
      const level = click && clickAt(loop, step)
      if (level) playDrum(kit, click, level === 'accent' ? 1 : 0.6, gridTime, volume * 0.8)
      visuals.push({ time, step })
      gridTime += stepSeconds(loop, bpm)
      step++
    }
  }

  const draw = () => {
    const heard = heardNow(ac)
    let last = null
    while (visuals.length && visuals[0].time <= heard) last = visuals.shift()
    if (last) onStep?.(last.step)
    frame = requestAnimationFrame(draw)
  }

  const needs = (o) => [...loopVoices(o.loop), ...(o.click ? [o.click] : [])]
  const loaded = loadKit(settings.kit, needs(settings)).then(() => {
    if (stopped) return
    gridTime = ac.currentTime + 0.06
    schedule()
    timer = setInterval(schedule, 25)
    frame = requestAnimationFrame(draw)
  })

  return {
    loaded,
    stop: () => {
      stopped = true
      clearInterval(timer)
      cancelAnimationFrame(frame)
    },
    update: (next) => {
      const changedSound = next.kit !== opts.kit || next.loop !== opts.loop || next.click !== opts.click
      opts = next
      // New drums load in the background; they join in as soon as they are ready.
      if (changedSound) loadKit(next.kit, needs(next)).catch(() => {})
    },
  }
}
