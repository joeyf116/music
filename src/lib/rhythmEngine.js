// The metronome engine. Clicks are scheduled a little ahead on the Web Audio clock so they stay steady even
// when the page is busy, and the beat lights follow the same clock at the moment the sound is heard.
// Settings can change while it runs (tempo, sound, accents…) and take effect from the next click.
import { audioContext } from './audio.js'
import { playClickSound } from './clickSounds.js'
import { barAudible, barPulses, tempoAtBar } from './rhythm.js'

const LOOKAHEAD = 0.12

/** Audio-clock time that is reaching the listener's ears right now. */
export const heardNow = (ac) => ac.currentTime - (ac.outputLatency || 0) - (ac.baseLatency || 0)

/** Audio-clock time (as heard) of a pointer or key event, using the event's own timestamp when it has one. */
export const eventTime = (ac, event) => {
  const age = event?.timeStamp ? Math.max(0, (performance.now() - event.timeStamp) / 1000) : 0
  return heardNow(ac) - Math.min(age, 0.2)
}

/**
 * Start clicking. `settings`: { bpm, accents, subdivision, sound, volume, subVolume, gap, speed, countIn }.
 * Callbacks: onPulse({ bar, beat, sub, level, audible }) as each click is heard (bar -1 during the count-in),
 * onTempo(bpm) when the speed trainer moves the tempo, onBeatScheduled(time, { bar, beat }) for every beat ahead
 * of time (for judging taps). Returns { stop, update(settings) }.
 */
export function startClickTrack(settings, { onPulse, onTempo, onBeatScheduled } = {}) {
  const ac = audioContext()
  if (!ac) return { stop: () => {}, update: () => {} }
  let opts = settings
  let bar = opts.countIn ? -1 : 0
  let pulseIndex = 0
  let nextTime = ac.currentTime + 0.08
  let lastTempo = null
  const visuals = []

  const pulsesFor = (b) => (b < 0 ? opts.accents.map((level, beat) => ({ beat, sub: 0, at: beat, level: beat === 0 ? 'accent' : 'beat' })) : barPulses(opts.accents, opts.subdivision))

  // Each click is placed after the previous one at the tempo of the moment, so changing tempo mid-bar never jumps.
  const schedule = () => {
    while (nextTime <= ac.currentTime + LOOKAHEAD) {
      const pulses = pulsesFor(bar)
      if (pulseIndex >= pulses.length) {
        bar++
        pulseIndex = 0
        continue
      }
      const tempo = tempoAtBar(Math.max(0, bar), opts.bpm, opts.speed)
      const p = pulses[pulseIndex]
      const time = nextTime
      const audible = bar < 0 || barAudible(bar, opts.gap)
      if (audible) playClickSound(opts.sound, time, p.level, p.level === 'sub' ? opts.volume * opts.subVolume : opts.volume)
      if (p.sub === 0 && bar >= 0) onBeatScheduled?.(time, { bar, beat: p.beat })
      if (tempo !== lastTempo && bar >= 0) {
        lastTempo = tempo
        visuals.push({ time, tempo })
      }
      visuals.push({ time, pulse: { bar, beat: p.beat, sub: p.sub, level: p.level, audible } })
      const following = pulses[pulseIndex + 1]
      nextTime += ((following ? following.at : opts.accents.length) - p.at) * (60 / tempo)
      pulseIndex++
    }
  }

  let frame = 0
  const draw = () => {
    const heard = heardNow(ac)
    while (visuals.length && visuals[0].time <= heard) {
      const v = visuals.shift()
      if (v.tempo) onTempo?.(v.tempo)
      else onPulse?.(v.pulse)
    }
    frame = requestAnimationFrame(draw)
  }

  schedule()
  const timer = setInterval(schedule, 25)
  frame = requestAnimationFrame(draw)
  return {
    stop: () => {
      clearInterval(timer)
      cancelAnimationFrame(frame)
    },
    update: (next) => {
      opts = next
    },
  }
}
