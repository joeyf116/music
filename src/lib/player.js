// Plays an exercise score in time with the tab. Notes are scheduled a little ahead on the Web Audio clock (so the
// rhythm stays steady even if the page is busy) and the cursor follows that same clock, so sound and tab stay in sync.
import { audioContext, playPitch } from './audio.js'
import { playClickSound, storedSound } from './clickSounds.js'

const LOOKAHEAD = 0.15
const STRUM_GAP = 0.014

// Clicks on every beat (plus any subdivisions, as fractions of a beat) and the score's events, merged in time
// order for one pass through the score. Each click has a level: the bar's first beat, other beats, or subdivisions.
export const timeline = (score, subdivision = [0]) => {
  const items = []
  const { beatTicks, barTicks } = score.meter
  for (let tick = 0; tick < score.totalTicks; tick += beatTicks) {
    subdivision.forEach((offset, k) => items.push({ tick: tick + offset * beatTicks, click: k === 0 && tick % barTicks === 0, level: k ? 'sub' : tick % barTicks === 0 ? 'accent' : 'beat' }))
  }
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
  // Muted strings are a short percussive "chk" rather than a ringing note.
  if (event.muted) return notes.map((n, i) => playPitch(n.pitch, delay + i * gap, 0.06, volume * 1.6))
  return notes.map((n, i) => playPitch(n.pitch, delay + i * gap, Math.max(0.15, ring), volume))
}

/**
 * Start playing `score`. Calls onStep(index) as each event sounds (index -1 with a beat number during the count-in),
 * onBpm(bpm) when the speed trainer raises the tempo and onEnd() when a non-looping run finishes. Returns a stop function.
 * `subdivision` adds quieter clicks between beats; `silent` keeps the cursor moving without sounding the notes (you
 * play them); `onHit(time)` reports the audio-clock time of each note as it is scheduled, for judging taps.
 */
export function startPlayback(score, { bpm, loop = true, countIn = false, click = false, subdivision = [0], clickVolume = 0.8, silent = false, speedUp = 0, maxBpm = 300, onStep, onBpm, onEnd, onHit }) {
  const ac = audioContext()
  if (!ac || !score.events.length) {
    onEnd?.()
    return () => {}
  }
  const items = timeline(score, subdivision)
  const sound = storedSound()
  const tick = (time, level) => playClickSound(sound, time, level, clickVolume)
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
      tick(time, b === 0 ? 'accent' : 'beat')
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
        if (click) tick(time, item.level)
      } else {
        const event = score.events[item.index]
        if (event.notes.length) onHit?.(time)
        if (event.notes.length && !silent) {
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
