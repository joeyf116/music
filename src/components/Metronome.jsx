import { useEffect, useRef, useState } from 'react'
import { audioContext } from '../lib/audio.js'
import { soundById } from '../lib/clickSounds.js'
import { METRONOME_METERS, SUBDIVISIONS, clampBpm, fitAccents, gapStatus, nextAccent, subdivisionById, tapTempo, tempoName } from '../lib/rhythm.js'
import { startClickTrack } from '../lib/rhythmEngine.js'
import { Field, Stepper, Toggle } from './controls.jsx'
import { SoundChips } from './SoundPicker.jsx'

const soundLabel = (id) => soundById(id).name
const ACCENT_NAMES = { accent: 'accented', beat: 'normal', mute: 'silent' }

/** One subdivision drawn as dots (big dot on the beat), so the choice is visible without reading. */
export const SubdivisionIcon = ({ sub }) => (
  <span className="sub-icon" aria-hidden="true">
    {sub.offsets.map((o, i) => (
      <span key={i} className={i === 0 ? 'on-beat' : ''} style={{ left: `${o * 100}%` }} />
    ))}
  </span>
)

/** Subdivision picker: a button per option with its dot pattern and what you'd count. */
export function SubdivisionPicker({ value, onChange }) {
  return (
    <div className="field">
      <span className="field-label" id="subdivision-label">
        Subdivision
      </span>
      <div className="sub-picker" role="radiogroup" aria-labelledby="subdivision-label">
        {SUBDIVISIONS.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={s.id === value} className={s.id === value ? 'on' : ''} onClick={() => onChange(s.id)} title={s.name}>
            <SubdivisionIcon sub={s} />
            <span className="sub-name">{s.name}</span>
            <small>{s.short}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Gap-click and speed trainers, shared by the metronome and the timing test. */
export function Trainers({ settings, update }) {
  const { gap, speed } = settings
  return (
    <div className="trainers">
      <div className="trainer">
        <Toggle checked={gap.on} onChange={(on) => update({ gap: { ...gap, on } })}>
          <strong>Gap click</strong>
          <small>The click drops out so you keep the time yourself.</small>
        </Toggle>
        {gap.on && (
          <div className="field-grid">
            <Stepper label="Click bars" value={gap.play} onChange={(v) => update({ gap: { ...gap, play: v } })} min={1} max={16} fallback={2} />
            <Stepper label="Silent bars" value={gap.mute} onChange={(v) => update({ gap: { ...gap, mute: v } })} min={1} max={16} fallback={2} />
          </div>
        )}
      </div>
      <div className="trainer">
        <Toggle checked={speed.on} onChange={(on) => update({ speed: { ...speed, on } })}>
          <strong>Speed trainer</strong>
          <small>Starts at your tempo and climbs a little at a time.</small>
        </Toggle>
        {speed.on && (
          <div className="field-grid">
            <Stepper label="Add BPM" value={speed.step} onChange={(v) => update({ speed: { ...speed, step: v } })} min={1} max={20} fallback={2} />
            <Stepper label="Every … bars" value={speed.every} onChange={(v) => update({ speed: { ...speed, every: v } })} min={1} max={32} fallback={4} />
            <Stepper label="Stop at BPM" value={speed.max} onChange={(v) => update({ speed: { ...speed, max: v } })} min={30} max={300} step={5} fallback={160} />
          </div>
        )}
      </div>
    </div>
  )
}

const isTyping = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)

/** A metronome built for practice: big tempo, beat lights you can tap to accent or mute, subdivisions, sounds and trainers. */
export default function Metronome({ settings, update, sound, onSoundChange }) {
  const [playing, setPlaying] = useState(false)
  const [pulse, setPulse] = useState(null)
  const [liveBpm, setLiveBpm] = useState(null)
  const [showSounds, setShowSounds] = useState(false)
  const engine = useRef(null)
  const taps = useRef([])
  const accents = fitAccents(settings.accents, settings.meter)
  const bpm = clampBpm(settings.bpm)
  const sub = subdivisionById(settings.subdivision)
  const engineSettings = useRef(null)
  const latest = { ...settings, bpm, accents, sound }
  // Keep the running engine (and the next start) on the latest settings; changes apply from the next click.
  useEffect(() => {
    engineSettings.current = latest
    engine.current?.update(latest)
  })

  useEffect(() => {
    if (!playing) return
    engine.current = startClickTrack(engineSettings.current, { onPulse: setPulse, onTempo: setLiveBpm })
    return () => {
      engine.current?.stop()
      engine.current = null
      setPulse(null)
      setLiveBpm(null)
    }
    // Only start/stop here; setting changes go to the running engine below so the beat never stumbles.
  }, [playing])

  const setBpm = (v) => update({ bpm: v })
  const nudge = (d) => setBpm(clampBpm(bpm + d))
  const tap = () => {
    const ac = audioContext()
    const now = ac ? ac.currentTime : performance.now() / 1000
    taps.current = [...taps.current.filter((t) => now - t < 4), now]
    const found = tapTempo(taps.current)
    if (found) setBpm(found)
  }
  const cycleAccent = (i) => update({ accents: accents.map((a, k) => (k === i ? nextAccent(a) : a)) })

  // Space starts/stops, ← → nudge the tempo (Shift for 5), T taps the tempo.
  const keyRef = useRef(null)
  useEffect(() => {
    keyRef.current = (e) => {
      if (isTyping(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === ' ' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (document.activeElement?.getAttribute('role') === 'tab') return
        e.preventDefault()
        nudge((e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 5 : 1))
      } else if (e.key === 't' || e.key === 'T') {
        tap()
      }
    }
  })
  useEffect(() => {
    const onKey = (e) => keyRef.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const shown = liveBpm ?? bpm
  const counting = pulse?.bar < 0
  const status = counting ? `Count-in ${pulse.beat + 1}…` : pulse ? gapStatus(pulse.bar, settings.gap) || (settings.speed.on ? `Bar ${pulse.bar + 1}` : '') : ''

  return (
    <div className="metronome">
      <div className="tempo-display">
        <button type="button" className="tempo-nudge" onClick={() => nudge(-1)} aria-label="Slower by 1 BPM">
          −
        </button>
        <div className="tempo-readout" aria-live="off">
          <span className="tempo-number">{shown}</span>
          <span className="tempo-unit">BPM{settings.meter.endsWith('/8') ? ' (8ths)' : ''}</span>
          <span className="tempo-name">{tempoName(shown)}</span>
        </div>
        <button type="button" className="tempo-nudge" onClick={() => nudge(1)} aria-label="Faster by 1 BPM">
          +
        </button>
      </div>
      <input type="range" className="tempo-slider" min={30} max={300} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} aria-label="Tempo" />
      <div className="tempo-quick">
        {[-10, -5].map((d) => (
          <button key={d} type="button" onClick={() => nudge(d)}>
            {d}
          </button>
        ))}
        <button type="button" className="tap-tempo" onClick={tap}>
          Tap tempo
        </button>
        {[5, 10].map((d) => (
          <button key={d} type="button" onClick={() => nudge(d)}>
            +{d}
          </button>
        ))}
      </div>

      <div className={`beat-lights${playing ? ' running' : ''}`} style={{ '--beats': accents.length }}>
        {accents.map((level, i) => {
          const lit = pulse && pulse.beat === i
          return (
            <button
              key={i}
              type="button"
              className={`beat-light level-${level}${lit && pulse.sub === 0 ? ' lit' : ''}${lit && pulse.audible === false ? ' silent' : ''}`}
              onClick={() => cycleAccent(i)}
              aria-label={`Beat ${i + 1}: ${ACCENT_NAMES[level]}. Tap to change.`}
            >
              <span className="beat-dot">{i + 1}</span>
              {sub.offsets.length > 1 && (
                <span className="beat-subs" aria-hidden="true">
                  {sub.offsets.slice(1).map((_, k) => (
                    <span key={k} className={lit && pulse.sub === k + 1 ? 'lit' : ''} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="hint beat-hint">Tap a beat to accent it, make it normal, or silence it (try silencing 1 and 3 to hear only the backbeat).</p>

      <div className="metronome-transport">
        <button type="button" className="primary play-button big-play" onClick={() => setPlaying(!playing)} aria-pressed={playing}>
          {playing ? '■ Stop' : '▶ Start'}
        </button>
        <span className="transport-status" aria-live="polite">
          {status}
        </span>
      </div>

      <div className="field-grid metronome-fields">
        <Field label="Time signature">
          <select value={settings.meter} onChange={(e) => update({ meter: e.target.value, accents: null })}>
            {METRONOME_METERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Toggle checked={settings.countIn} onChange={(countIn) => update({ countIn })}>
          Count-in bar
        </Toggle>
      </div>

      <SubdivisionPicker value={sub.id} onChange={(subdivision) => update({ subdivision })} />

      <details className="option-panel" open={showSounds} onToggle={(e) => setShowSounds(e.currentTarget.open)}>
        <summary>
          Sound &amp; volume <span className="settings-summary">{sound ? soundLabel(sound) : ''}</span>
        </summary>
        <SoundChips value={sound} onChange={onSoundChange} volume={settings.volume} />
        <div className="field-grid volume-fields">
          <Field label={`Click volume ${Math.round(settings.volume * 100)}%`}>
            <input type="range" min={0.1} max={1} step={0.05} value={settings.volume} onChange={(e) => update({ volume: Number(e.target.value) })} />
          </Field>
          <Field label={`Subdivisions ${Math.round(settings.subVolume * 100)}%`}>
            <input type="range" min={0} max={1} step={0.05} value={settings.subVolume} onChange={(e) => update({ subVolume: Number(e.target.value) })} disabled={sub.offsets.length === 1} />
          </Field>
        </div>
      </details>

      <details className="option-panel">
        <summary>
          Trainers <span className="settings-summary">{[settings.gap.on && 'Gap click', settings.speed.on && 'Speed trainer'].filter(Boolean).join(' · ') || 'Off'}</span>
        </summary>
        <Trainers settings={settings} update={update} />
      </details>

      <p className="hint keys-hint">Keys: Space start/stop · ← → tempo (Shift ×5) · T tap tempo.</p>
    </div>
  )
}
