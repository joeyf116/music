// Plays an exercise score in time with the tab. Notes are scheduled a little ahead on the Web Audio clock (so the
// rhythm stays steady even if the page is busy) and the cursor follows that same clock, so sound and tab stay in sync.
import { audioContext, playClick, playPitch } from './audio.js'

const LOOKAHEAD = 0.15
const STRUM_GAP = 0.014

// Clicks on every beat and the score's events, merged in time order for one pass through the score.
export const timeline = (score) => {
  const items = []
  for (let tick = 0; tick < score.totalTicks; tick += score.meter.beatTicks) items.push({ tick, click: tick % score.meter.barTicks === 0 })
  score.events.forEach((event, index) => items.push({ tick: event.tick, index }))
  return items.sort((a, b) => a.tick - b.tick || ('click' in a ? -1 : 1))
}

// Notes of one event in the order they are struck: strums roll across the strings, everything else is plucked together.
export const strikeOrder = (event) => {
  const notes = [...event.notes].sort((a, b) => a.string - b.string)
  return event.strum === 'up' ? notes.reverse() : notes
}

/** Sound one event (e.g. when a tab column is clicked). `ring` is how long it lasts in seconds. */
export function playEvent(event, delay = 0, ring = 1.2) {
  const notes = strikeOrder(event)
  const chord = notes.length > 2
  const gap = event.strum ? STRUM_GAP : 0
  const volume = (chord ? 0.09 : 0.16) * (event.barStart ? 1.2 : 1) * (event.strum === 'up' ? 0.8 : 1)
  return notes.map((n, i) => playPitch(n.pitch, delay + i * gap, Math.max(0.15, ring), volume))
}

/**
 * Start playing `score`. Calls onStep(index) as each event sounds (index -1 with a beat number during the count-in),
 * onBpm(bpm) when the speed trainer raises the tempo and onEnd() when a non-looping run finishes. Returns a stop function.
 */
export function startPlayback(score, { bpm, loop = true, countIn = false, click = false, speedUp = 0, maxBpm = 300, onStep, onBpm, onEnd }) {
  const ac = audioContext()
  if (!ac || !score.events.length) {
    onEnd?.()
    return () => {}
  }
  const items = timeline(score)
  const { beatTicks, barTicks } = score.meter
  let tempo = bpm
  const tickSeconds = () => 60 / tempo / beatTicks
  let passStart = ac.currentTime + 0.1
  let next = 0
  let endTime = Infinity
  const visuals = []
  let voices = []

  if (countIn) {
    const beats = barTicks / beatTicks
    for (let b = 0; b < beats; b++) {
      const time = passStart + b * beatTicks * tickSeconds()
      playClick(time, b === 0)
      visuals.push({ time, index: -1, count: b + 1 })
    }
    passStart += barTicks * tickSeconds()
  }

  const schedule = () => {
    while (endTime === Infinity) {
      if (next >= items.length) {
        const passEnd = passStart + score.totalTicks * tickSeconds()
        if (!loop) {
          endTime = passEnd
          break
        }
        passStart = passEnd
        next = 0
        if (speedUp && tempo < maxBpm) {
          tempo = Math.min(maxBpm, tempo + speedUp)
          visuals.push({ time: passStart, bpm: tempo })
        }
        continue
      }
      const item = items[next]
      const time = passStart + item.tick * tickSeconds()
      if (time > ac.currentTime + LOOKAHEAD) break
      if ('click' in item) {
        if (click) playClick(time, item.click)
      } else {
        const event = score.events[item.index]
        if (event.notes.length) {
          const ring = Math.min(2.5, event.ring * tickSeconds() + 0.08)
          voices.push({ end: time + ring, stops: playEvent(event, time - ac.currentTime, ring) })
        }
        visuals.push({ time, index: item.index })
      }
      next++
    }
    voices = voices.filter((v) => v.end > ac.currentTime)
  }

  // Move the cursor when the sound actually comes out of the speakers.
  let frame = 0
  const draw = () => {
    const heard = ac.currentTime - (ac.outputLatency || 0) - (ac.baseLatency || 0)
    while (visuals.length && visuals[0].time <= heard) {
      const v = visuals.shift()
      if (v.bpm) onBpm?.(v.bpm)
      else onStep?.(v.index, v.count)
    }
    if (heard >= endTime) {
      stop()
      onEnd?.()
      return
    }
    frame = requestAnimationFrame(draw)
  }

  schedule()
  const timer = setInterval(schedule, 25)
  frame = requestAnimationFrame(draw)

  function stop() {
    clearInterval(timer)
    cancelAnimationFrame(frame)
    voices.forEach((v) => v.stops.forEach((s) => s()))
    voices = []
  }
  return stop
}
