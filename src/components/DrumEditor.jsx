import { useEffect, useRef, useState } from 'react'
import { PAINT_LEVELS, addVoice, pressMode, removeVoice, setMix, setStep } from '../lib/drumEdit.js'
import { DRUM_VOICES, LEVEL_NAMES, barCount, countLabel, gridSegments, loopTracks, stepCount, trackMix, voiceName } from '../lib/drumLoops.js'
import { Choice } from './controls.jsx'
import Menu from './Menu.jsx'

function useNarrow() {
  const query = '(max-width: 479px)'
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const m = window.matchMedia?.(query)
    if (!m) return undefined
    const on = () => setNarrow(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return narrow
}

const VOLUMES = [1, 0.75, 0.5, 0.25]

/** The drum's name (a menu for its volume and removing it) with mute and solo buttons. */
function RowHead({ loop, voice, onChange, compact }) {
  const mix = trackMix(loop, voice)
  const name = voiceName(voice, true)
  if (compact) return <span className="edit-name-only">{name}</span>
  return (
    <span className="edit-head">
      <button type="button" className={`ms-button${mix.mute ? ' on mute' : ''}`} aria-pressed={mix.mute} aria-label={`Mute ${name}`} title="Mute" onClick={() => onChange(setMix(loop, voice, { mute: !mix.mute }))}>
        M
      </button>
      <button type="button" className={`ms-button${mix.solo ? ' on solo' : ''}`} aria-pressed={mix.solo} aria-label={`Solo ${name}`} title="Solo" onClick={() => onChange(setMix(loop, voice, { solo: !mix.solo }))}>
        S
      </button>
      <Menu
        label={`${name}: volume or remove`}
        className="edit-menu"
        buttonClassName="edit-name"
        items={[
          { heading: 'Volume' },
          ...VOLUMES.map((v) => ({ label: `${v === mix.volume ? '✓ ' : ''}${Math.round(v * 100)}%`, onSelect: () => onChange(setMix(loop, voice, { volume: v })) })),
          { separator: true },
          { label: 'Remove drum', destructive: true, disabled: Object.keys(loop.tracks).length === 1, onSelect: () => onChange(removeVoice(loop, voice)) },
        ]}
      >
        <span>{name}</span>
        {mix.volume !== 1 && <small>{Math.round(mix.volume * 100)}%</small>}
      </Menu>
    </span>
  )
}

/**
 * The groove editor: press a step to paint it with the chosen level, drag along a row to paint more, press a
 * painted step to clear it. Arrow keys move between steps; Space or Enter paints or clears; 1, 2, 3 paint a
 * hit, accent or ghost note; Delete clears.
 * onEdit(loop) starts an edit (undoable); onContinue(loop) adds to it while dragging.
 * onAudition(voice, level) lets you hear a step as you paint it.
 */
export default function DrumEditor({ loop, paint, onPaintChange, onEdit, onContinue, onAudition, playing, current, toolbar }) {
  const narrow = useNarrow()
  const tracks = loopTracks(loop)
  const n = stepCount(loop)
  const drag = useRef(null)
  const latest = useRef(loop)
  const [focus, setFocus] = useState({ voice: tracks[0]?.voice, step: 0 })
  const grid = useRef(null)
  const focusVoice = tracks.some((t) => t.voice === focus.voice) ? focus.voice : tracks[0]?.voice
  const focusStep = Math.min(focus.step, n - 1)

  useEffect(() => {
    latest.current = loop
  }, [loop])

  const apply = (voice, step, mode, first) => {
    const base = latest.current
    if (base.tracks[voice]?.[step] === mode) return
    const next = setStep(base, voice, step, mode)
    latest.current = next
    ;(first ? onEdit : onContinue)(next)
    if (mode !== '.') onAudition(voice, mode)
  }

  const cellAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('[data-step]')

  const onPointerDown = (e) => {
    const cell = e.target.closest('[data-step]')
    if (!cell || e.button > 0) return
    const voice = cell.dataset.voice
    const step = Number(cell.dataset.step)
    const mode = pressMode(latest.current, voice, step, paint)
    drag.current = { voice, mode, pointer: e.pointerId }
    setFocus({ voice, step })
    apply(voice, step, mode, true)
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || d.pointer !== e.pointerId) return
    const cell = cellAt(e.clientX, e.clientY)
    if (cell && cell.dataset.voice === d.voice) apply(d.voice, Number(cell.dataset.step), d.mode, false)
  }

  useEffect(() => {
    const end = () => {
      drag.current = null
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [])

  const moveFocus = (voice, step) => {
    setFocus({ voice, step })
    grid.current?.querySelector(`[data-voice="${voice}"][data-step="${step}"]`)?.focus()
  }

  const onKeyDown = (e) => {
    const cell = e.target.closest?.('[data-step]')
    if (!cell) return
    const voice = cell.dataset.voice
    const step = Number(cell.dataset.step)
    const row = tracks.findIndex((t) => t.voice === voice)
    const levelKey = { 1: 'x', 2: 'X', 3: 'g' }[e.key]
    if (e.key === 'ArrowRight') moveFocus(voice, (step + 1) % n)
    else if (e.key === 'ArrowLeft') moveFocus(voice, (step - 1 + n) % n)
    else if (e.key === 'ArrowDown') moveFocus(tracks[Math.min(tracks.length - 1, row + 1)].voice, step)
    else if (e.key === 'ArrowUp') moveFocus(tracks[Math.max(0, row - 1)].voice, step)
    else if (e.key === 'Home') moveFocus(voice, 0)
    else if (e.key === 'End') moveFocus(voice, n - 1)
    else if (e.key === ' ' || e.key === 'Enter') apply(voice, step, pressMode(latest.current, voice, step, paint), true)
    else if (e.key === 'Delete' || e.key === 'Backspace') apply(voice, step, '.', true)
    else if (levelKey) {
      onPaintChange(levelKey)
      apply(voice, step, levelKey, true)
    } else return
    e.preventDefault()
  }

  const missing = DRUM_VOICES.filter((v) => loop.tracks[v.id] === undefined)
  const segments = gridSegments(loop, narrow)

  return (
    <div className="drum-editor">
      <div className="edit-toolbar">
        <Choice label="Paint" options={PAINT_LEVELS} value={paint} onChange={onPaintChange} size="small" className="paint-choice" />
        {toolbar}
      </div>
      <div
        className="edit-grid"
        ref={grid}
        role="grid"
        aria-label={`${loop.name ?? 'Groove'}: steps by drum`}
        aria-rowcount={tracks.length}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        {segments.map((seg, si) => (
          <div className="edit-segment" role="rowgroup" key={si} aria-label={barCount(loop) > 1 ? `Bar ${seg.bar + 1}` : undefined}>
            {(barCount(loop) > 1 || segments.length > 1) && (
              <span className="edit-segment-label" aria-hidden="true">
                Bar {seg.bar + 1}
                {segments.length > barCount(loop) ? `, beats ${seg.firstBeat + 1}-${seg.firstBeat + seg.beats}` : ''}
              </span>
            )}
            {tracks.map((t) => {
              const mix = trackMix(loop, t.voice)
              return (
                <div className={`edit-row${mix.mute ? ' muted' : ''}`} role="row" key={t.voice}>
                  <span role="rowheader" className="edit-rowhead">
                    <RowHead loop={loop} voice={t.voice} onChange={onEdit} compact={si > 0} />
                  </span>
                  <span className="edit-beats" style={{ '--beats': seg.beats }}>
                    {Array.from({ length: seg.beats }, (_, b) => (
                      <span className="edit-beat" key={b} style={{ '--steps': loop.steps }}>
                        {Array.from({ length: loop.steps }, (_, i) => {
                          const step = seg.start + b * loop.steps + i
                          const c = t.steps[step]
                          const level = c === '.' ? null : LEVEL_NAMES[c]
                          const isFocus = t.voice === focusVoice && step === focusStep
                          return (
                            <button
                              type="button"
                              role="gridcell"
                              key={i}
                              data-voice={t.voice}
                              data-step={step}
                              tabIndex={isFocus ? 0 : -1}
                              aria-label={`${voiceName(t.voice)}, ${countLabel(loop, step)}: ${level ?? 'rest'}`}
                              className={`loop-step lv-${level ?? 'off'}${playing && current === step ? ' now' : ''}${i === 0 ? ' on-beat' : ''}`}
                              onFocus={() => !isFocus && setFocus({ voice: t.voice, step })}
                            >
                              {level === 'accent' && <span aria-hidden="true">›</span>}
                            </button>
                          )
                        })}
                      </span>
                    ))}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {missing.length > 0 && (
        <select
          className="add-drum"
          aria-label="Add a drum"
          value=""
          onChange={(e) => {
            if (e.target.value) onEdit(addVoice(loop, e.target.value))
          }}
        >
          <option value="">+ Add a drum…</option>
          {missing.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
