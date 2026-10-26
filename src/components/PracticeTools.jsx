import { useEffect, useState } from 'react'
import { startDrone, startMetronome } from '../lib/audio.js'

const BEATS = 4

/** Metronome (at the shared BPM) and a drone on the current key's root. */
export default function PracticeTools({ bpm, dronePitch, droneName }) {
  const [clicking, setClicking] = useState(false)
  const [droning, setDroning] = useState(false)
  const [beat, setBeat] = useState(null)

  useEffect(() => {
    if (!clicking) return
    const stop = startMetronome(Math.max(30, Math.min(300, Number(bpm) || 100)), BEATS, setBeat)
    return () => {
      stop()
      setBeat(null)
    }
  }, [clicking, bpm])

  useEffect(() => {
    if (!droning) return
    return startDrone(dronePitch)
  }, [droning, dronePitch])

  return (
    <div className="practice-tools">
      <button type="button" className={clicking ? 'on' : ''} aria-pressed={clicking} onClick={() => setClicking(!clicking)}>
        Metronome
      </button>
      <span className="beats" aria-hidden="true">
        {Array.from({ length: BEATS }, (_, i) => (
          <span key={i} className={`beat${beat === i ? ' lit' : ''}`} />
        ))}
      </span>
      <button type="button" className={droning ? 'on' : ''} aria-pressed={droning} onClick={() => setDroning(!droning)}>
        Drone {droneName}
      </button>
    </div>
  )
}
