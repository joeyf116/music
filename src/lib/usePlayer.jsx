import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { audioContext, startDrone } from './audio.js'
import { loadKit, loopVoices, startDrumLoop } from './drumEngine.js'
import { BACKINGS, clampBpm, currentGroove } from './practiceBacking.js'
import { startPlayback } from './player.js'
import { practiceScore, validItems } from './practiceTab.js'
import { mod12, noteToPc } from './theory.js'
import usePersistentState from './usePersistentState.js'
import useWakeLock from './useWakeLock.js'

// One player for the whole app, so music keeps going when you change pages: the practice tab (with an optional
// click or drum groove behind it) and the Drums page's groove share one tempo and one Play / Stop. Only one thing
// plays at a time; starting one stops the other. The metronome keeps its own engine but stops these when it starts.

const PlayerContext = createContext(null)

export function PlayerProvider({ tuning, keyName, children }) {
  const [bpm, setBpm] = usePersistentState('music.bpm', 100)
  const [storedItems, setItems] = usePersistentState('music.practiceTab', [])
  const [chordStyle, setChordStyle] = usePersistentState('music.chordStyle', 'strum')
  const [backing, setBacking] = usePersistentState('music.practiceBacking', 'off')
  const [drone, setDrone] = usePersistentState('music.practiceDrone', false)
  const items = useMemo(() => validItems(storedItems), [storedItems])
  const tempo = clampBpm(bpm)

  // ---- The groove engine: the Drums page's groove, or the practice tab's backing ----
  const engine = useRef(null)
  const [groove, setGroove] = useState({ playing: false, loading: false, failed: false, step: -1, name: '', source: null })

  const stopGroove = useCallback(() => {
    engine.current?.stop()
    engine.current = null
    setGroove((g) => ({ ...g, playing: false, loading: false, step: -1, source: null }))
  }, [])

  const runGroove = useCallback((settings, { name, source, startAt }) => {
    engine.current?.stop()
    const e = startDrumLoop(settings, { startAt, onStep: (step) => setGroove((g) => (g.step === step ? g : { ...g, step })) })
    engine.current = e
    setGroove({ playing: true, loading: true, failed: false, step: -1, name, source })
    e.loaded.then(
      () => engine.current === e && setGroove((g) => ({ ...g, loading: false })),
      () => {
        if (engine.current !== e) return
        e.stop()
        engine.current = null
        setGroove({ playing: false, loading: false, failed: true, step: -1, name, source: null })
      },
    )
  }, [])

  const updateGroove = useCallback((settings, name) => {
    engine.current?.update(settings)
    if (name) setGroove((g) => (g.name === name ? g : { ...g, name }))
  }, [])

  // ---- The practice tab ----
  const [practiceWanted, setPracticePlaying] = useState(false)
  // Clearing the practice tab stops it.
  const practicePlaying = practiceWanted && items.length > 0
  const [practiceActive, setPracticeActive] = useState(null)
  const score = useMemo(() => practiceScore(items, tuning, chordStyle), [items, tuning, chordStyle])
  const withGroove = backing === 'groove'

  useEffect(() => {
    if (!practicePlaying) return undefined
    let stopNotes = null
    let cancelled = false
    let mine = null
    const begin = (startAt) => {
      if (cancelled) return
      stopNotes = startPlayback(score, {
        bpm: tempo,
        loop: true,
        click: backing === 'click',
        startAt,
        onStep: (index) => {
          if (index >= 0) setPracticeActive(score.events[index]?.column ?? null)
        },
        onEnd: () => setPracticePlaying(false),
      })
    }
    if (withGroove) {
      // Load the drums first, then start the tab and the groove on the same beat.
      const { name, settings } = currentGroove(tempo)
      loadKit(settings.kit, loopVoices(settings.loop))
        .catch(() => {})
        .then(() => {
          if (cancelled) return
          const startAt = (audioContext()?.currentTime ?? 0) + 0.12
          begin(startAt)
          runGroove(settings, { name, source: 'practice', startAt })
          mine = engine.current
        })
    } else begin()
    return () => {
      cancelled = true
      stopNotes?.()
      // Only stop the groove this started: pressing Play on the Drums page may already have replaced it.
      if (mine && engine.current === mine) stopGroove()
    }
  }, [practicePlaying, score, tempo, backing, withGroove, runGroove, stopGroove])

  const dronePitch = 40 + mod12(noteToPc(keyName) - 4)
  useEffect(() => (practicePlaying && drone ? startDrone(dronePitch) : undefined), [practicePlaying, drone, dronePitch])

  const stopPractice = useCallback(() => setPracticePlaying(false), [])
  const startPractice = useCallback(() => {
    if (engine.current) stopGroove()
    setPracticePlaying(true)
  }, [stopGroove])

  // ---- The Drums page asks for its groove ----
  const playGroove = useCallback(
    (settings, name) => {
      setPracticePlaying(false)
      runGroove(settings, { name, source: 'drums' })
    },
    [runGroove],
  )

  const stopAll = useCallback(() => {
    setPracticePlaying(false)
    stopGroove()
  }, [stopGroove])

  const playing = practicePlaying || groove.playing
  useWakeLock(playing)
  useEffect(() => () => engine.current?.stop(), [])

  const value = {
    bpm: tempo,
    setBpm,
    // Practice tab
    items,
    setItems,
    chordStyle,
    setChordStyle,
    backing: BACKINGS.some((b) => b.value === backing) ? backing : 'off',
    setBacking,
    drone,
    setDrone,
    score,
    practicePlaying,
    practiceActive,
    setPracticeActive,
    startPractice,
    stopPractice,
    // Groove
    groove,
    playGroove,
    updateGroove,
    stopGroove,
    stopAll,
    playing,
  }
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  return useContext(PlayerContext)
}
