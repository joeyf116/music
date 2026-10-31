import { useEffect, useMemo, useRef, useState } from 'react'
import { playEvent, startPlayback } from '../lib/player.js'
import { PLAY_ON, RHYTHMS, RHYTHM_LEVELS, clampBpm, parseBeats, regridBeat, rhythmById, rhythmCells, rhythmScore, toggleCell } from '../lib/rhythm.js'
import { noteToPc } from '../lib/theory.js'
import useTapJudge from '../lib/useTapJudge.js'
import usePersistentState from '../lib/usePersistentState.js'
import { Choice, Field, Stepper, Toggle } from './controls.jsx'
import Tab from './Tab.jsx'
import TapPad, { TapResults } from './TapPad.jsx'
import { Disclosure } from './layout.jsx'

const DEFAULTS = { level: 1, rhythm: 'q-e-q-e', beats: rhythmById('q-e-q-e').beats, playOn: 'muted', mode: 'listen', countIn: true, clickGrid: false, showTab: true }
const MODES = [
  { value: 'listen', label: 'Listen', title: 'Hear the rhythm with the click' },
  { value: 'along', label: 'Play along', title: 'Only the click plays; you strum the rhythm' },
]
const GRIDS = [
  { value: 2, label: '8ths' },
  { value: 3, label: 'Trip' },
  { value: 4, label: '16ths' },
]
const COLUMN_WIDTH = { 1: 34, 2: 30, 3: 26, 4: 22, 6: 18 }
const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)

/**
 * Strumming rhythm drills: pick a rhythm, see it on a counting grid and in tab with strum directions, hear it,
 * then play along (or tap it) and get timing feedback. Tap the grid while editing to write your own.
 */
export default function RhythmDrills({ tuning, stringName, keyName, minor, settings, update }) {
  const [stored, setStored] = usePersistentState('music.rhythmDrill', DEFAULTS)
  const drill = { ...DEFAULTS, ...stored }
  const set = (patch) => setStored({ ...drill, ...patch })
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(null)
  const [countBeat, setCountBeat] = useState(null)
  const [editing, setEditing] = useState(false)
  const judge = useTapJudge(Number(settings.tapCorrection) || 0)

  const bpm = clampBpm(settings.bpm)
  const preset = rhythmById(drill.rhythm)
  const custom = !preset || preset.beats !== drill.beats
  const level = RHYTHM_LEVELS.find((l) => l.id === drill.level) ?? RHYTHM_LEVELS[0]
  const inLevel = RHYTHMS.filter((r) => r.level === level.id)
  const cells = rhythmCells(drill.beats)
  const beats = parseBeats(drill.beats)
  const score = useMemo(() => rhythmScore(drill.beats, { bars: 2, tuning, playOn: drill.playOn, rootPc: noteToPc(keyName), minor }), [drill.beats, tuning, drill.playOn, keyName, minor])
  // The click can follow the grid of the pattern's busiest beat, for counting the in-between notes.
  const finest = Math.max(...beats.map((b) => b.length))
  const clickGrid = drill.clickGrid && finest > 1 ? finest : 1
  const { addTarget, clearTargets } = judge

  const started = useRef(false)
  useEffect(() => {
    if (!playing) {
      started.current = false
      return
    }
    clearTargets()
    const stop = startPlayback(score, {
      bpm,
      loop: true,
      countIn: drill.countIn && !started.current,
      click: true,
      subdivision: Array.from({ length: clickGrid }, (_, i) => i / clickGrid),
      clickVolume: settings.volume,
      silent: drill.mode === 'along',
      onStep: (index, count) => {
        setCountBeat(count ?? null)
        if (index >= 0) setActive(index)
      },
      onHit: addTarget,
    })
    started.current = true
    return () => {
      stop()
      setCountBeat(null)
    }
  }, [playing, score, bpm, drill.mode, clickGrid, drill.countIn, settings.volume, addTarget, clearTargets])

  const toggle = () => {
    if (!playing) {
      setActive(null)
      setEditing(false)
    }
    setPlaying(!playing)
  }
  const pick = (r) => set({ rhythm: r.id, beats: r.beats, level: r.level })
  const step = (d) => {
    const index = RHYTHMS.findIndex((r) => r.id === drill.rhythm)
    pick(RHYTHMS[(index + d + RHYTHMS.length) % RHYTHMS.length])
  }
  const random = () => {
    const options = inLevel.filter((r) => r.id !== drill.rhythm)
    pick(options[Math.floor(Math.random() * options.length)] ?? inLevel[0])
  }

  // Space plays/stops; while playing, letter keys tap the rhythm.
  const keyRef = useRef(null)
  useEffect(() => {
    keyRef.current = (e) => {
      if (isTyping(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      if (e.key === ' ' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault()
        toggle()
      } else if (playing && /^[a-z]$/i.test(e.key)) {
        judge.tap(e)
      }
    }
  })
  useEffect(() => {
    const onKey = (e) => keyRef.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const activeCell = active === null ? null : active % cells.length
  const columns = score.events.map((e) => ({ notes: e.notes, label: e.label, sublabel: e.count, groupStart: e.barStart }))
  const tuningNames = tuning.map((_, i) => (i === tuning.length - 1 ? stringName(i).toLowerCase() : stringName(i)))
  const hits = cells.filter((c) => c.hit).length

  return (
    <div className="rhythm-drills">
      <div className="drill-picker">
        <Field label="Level" className="level-field">
          <select value={level.id} onChange={(e) => pick(RHYTHMS.find((r) => r.level === Number(e.target.value)))}>
            {RHYTHM_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id}. {l.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="rhythm-chips" role="group" aria-label={`${level.name} rhythms`}>
          {inLevel.map((r) => (
            <button key={r.id} type="button" className={r.id === drill.rhythm && !custom ? 'on' : ''} aria-pressed={r.id === drill.rhythm && !custom} onClick={() => pick(r)}>
              {r.name}
            </button>
          ))}
        </div>
        <p className="level-about">{level.about}</p>
      </div>

      <div className="rhythm-head">
        <button type="button" className="icon-button" onClick={() => step(-1)} aria-label="Previous rhythm">
          ‹
        </button>
        <h2>
          {custom ? 'Your rhythm' : preset.name}
          <small>
            {beats.length}/4 · {hits} {hits === 1 ? 'strum' : 'strums'} a bar
          </small>
        </h2>
        <button type="button" className="icon-button" onClick={() => step(1)} aria-label="Next rhythm">
          ›
        </button>
        <button type="button" onClick={random} title="A random rhythm from this level">
          🎲
        </button>
      </div>

      {/* The counting grid: say the counts, strum on the filled boxes. Tap a box to hear it, or to change it while editing. */}
      <div className={`rhythm-grid${editing ? ' editing' : ''}`} style={{ '--beats': beats.length }}>
        {beats.map((b, beat) => (
          <div key={beat} className="rhythm-beat">
            <div className="rhythm-cells" style={{ '--cells': b.length }}>
              {cells
                .filter((c) => c.beat === beat)
                .map((c) => {
                  const index = cells.indexOf(c)
                  return (
                    <button
                      key={c.cell}
                      type="button"
                      className={`rhythm-cell${c.hit ? ' hit' : ''}${index === activeCell ? ' now' : ''}${c.cell === 0 ? ' downbeat' : ''}`}
                      aria-pressed={editing ? c.hit : undefined}
                      aria-label={`${c.count || beat + 1}: ${c.hit ? `strum ${c.strum}` : 'rest'}`}
                      onClick={() => {
                        if (editing) set({ beats: toggleCell(drill.beats, beat, c.cell) })
                        else if (c.hit) playEvent(score.events[index])
                      }}
                    >
                      <span className="cell-count">{c.count}</span>
                      <span className="cell-strum">{c.hit ? (c.strum === 'up' ? '↑' : '↓') : ''}</span>
                    </button>
                  )
                })}
            </div>
            {editing && <Choice label={`Beat ${beat + 1} grid`} hideLabel size="small" options={GRIDS} value={b.length} onChange={(size) => set({ beats: regridBeat(drill.beats, beat, size) })} className="beat-grid-choice" />}
          </div>
        ))}
      </div>
      <div className="rhythm-edit-row">
        <Toggle checked={editing} onChange={setEditing}>
          Edit rhythm
        </Toggle>
        {custom && preset && (
          <button type="button" className="link-button" onClick={() => set({ beats: preset.beats })}>
            Reset to “{preset.name}”
          </button>
        )}
      </div>

      <div className={`transport${playing ? ' playing' : ''}`}>
        <button type="button" className="primary play-button" onClick={toggle} aria-pressed={playing}>
          {playing ? '■ Stop' : '▶ Play'}
        </button>
        <Stepper label="BPM" value={settings.bpm} onChange={(v) => update({ bpm: v })} min={30} max={300} step={5} fallback={80} className="tempo-field" />
        <Choice label="Mode" options={MODES} value={drill.mode} onChange={(mode) => set({ mode })} className="mode-choice" />
        <span className="transport-status" aria-live="polite">
          {countBeat ? `Count-in ${countBeat}…` : ''}
        </span>
      </div>

      <div className="field-grid drill-options">
        <Choice label="Sound on" options={PLAY_ON} value={drill.playOn} onChange={(playOn) => set({ playOn })} />
        <div className="toggles">
          <Toggle checked={drill.clickGrid} onChange={(clickGrid) => set({ clickGrid })}>
            Click the subdivisions
          </Toggle>
          <Toggle checked={drill.countIn} onChange={(countIn) => set({ countIn })}>
            Count-in
          </Toggle>
          <Toggle checked={drill.showTab} onChange={(showTab) => set({ showTab })}>
            Show as tab
          </Toggle>
        </div>
      </div>

      {drill.showTab && <Tab columns={columns} tuningNames={tuningNames} columnWidth={COLUMN_WIDTH[finest] ?? 24} active={active} onSelect={(i) => !playing && score.events[i]?.notes.length && playEvent(score.events[i])} follow={playing} />}

      <div className="tap-along">
        <h3>Tap it</h3>
        <p className="hint">Press Play, then tap the rhythm (not the beat) on the pad or any letter key. Each tap is checked against the nearest strum.</p>
        <TapPad judge={judge} disabled={!playing} idle={playing ? 'Tap the rhythm here' : 'Press Play, then tap the rhythm here'} label="Tap the rhythm" />
        <TapResults judge={judge} onReset={judge.reset} />
      </div>

      <Disclosure label="How to practise a rhythm" quiet className="option-panel how-to">
        <ol>
          <li>
            <strong>Listen</strong> once or twice and follow the boxes.
          </li>
          <li>
            <strong>Count out loud</strong> (“1 & 2 &…”) and clap or tap the filled boxes.
          </li>
          <li>
            <strong>Play along</strong> on muted strings, keeping your strumming hand moving down-up even through the gaps.
          </li>
          <li>
            <strong>Speed up</strong> only when it feels easy at this tempo; 5 BPM at a time.
          </li>
        </ol>
      </Disclosure>
    </div>
  )
}
