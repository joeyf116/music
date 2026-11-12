import { useEffect, useMemo, useState } from 'react'
import { playChord, playPitch } from '../lib/audio.js'
import { LABEL_OPTIONS, LEGEND, progressionMood, tabStringNames } from '../lib/fretboardView.js'
import { randomProgression } from '../lib/exercises.js'
import { BACKINGS, currentGroove } from '../lib/practiceBacking.js'
import { BEAT_OPTIONS, CHORD_STYLES, LINE_KINDS, PRACTICE_MODES, PROGRESSIONS, createStep, duplicateStep, editVoicing, moveStep, removeStep, revoiceAll, stepsFromText, updateStep, voiceStep } from '../lib/progression.js'
import { SCALES, findPositions, intervalName, mod12, noteToPc, pcName, spellNotes, usesFlats } from '../lib/theory.js'
import usePersistentState from '../lib/usePersistentState.js'
import { usePlayer } from '../lib/usePlayer.jsx'
import { Choice, Field, Stepper, Toggle } from './controls.jsx'
import DiatonicChords from './DiatonicChords.jsx'
import Fretboard, { zoomWindow } from './Fretboard.jsx'
import KeyPicker from './KeyPicker.jsx'
import Menu from './Menu.jsx'
import Tab from './Tab.jsx'
import TuningSelect from './TuningSelect.jsx'
import { Disclosure, PageHeader } from './layout.jsx'

// True on phone-width screens (under 720 px), following rotation and resizing.
function useNarrow() {
  const query = '(max-width: 719px)'
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches))
  useEffect(() => {
    const list = window.matchMedia?.(query)
    if (!list) return undefined
    const onChange = () => setNarrow(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [])
  return narrow
}

const BEAT_CHOICES = BEAT_OPTIONS.map((b) => ({ value: b, label: String(b) }))
const beatsText = (b) => `${b} ${b === 1 ? 'beat' : 'beats'}`

/**
 * The Practice page: one progression, built from the key's chords, that everything else follows. Tap a chord to see
 * and change its voicing on the neck, or switch to Scales to play a line through the changes in one position.
 * The progression, its tab and playback live in the app-wide player, so the music keeps going on other pages.
 */
export default function PracticePage({ keyName, onKeyChange, scaleType, onScaleChange, tuning, tuningSpec, tuningId, onTuningChange }) {
  const player = usePlayer()
  const { steps, setSteps, session, mode, setMode, position, setPosition, line, setLine, playLine, setPlayLine, chordStyle, setChordStyle, bpm, setBpm, practicePlaying: playing, practiceActive, setPracticeActive } = player
  const [kind, setKind] = usePersistentState('music.practiceVoicing', 'shapes')
  const [labels, setLabels] = usePersistentState('music.labels', 'notes')
  const [zoomPref, setZoomPref] = usePersistentState('music.neckZoom', true)
  const [sevenths, setSevenths] = usePersistentState('music.diatonicSevenths', false)
  const narrow = useNarrow()
  const [selected, setSelected] = useState(0)
  const [adding, setAdding] = useState(false)
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState('')
  const [undo, setUndo] = useState(null)

  // While it plays, the neck follows the chord being played.
  const playingStep = playing && practiceActive !== null ? (session.owner[practiceActive] ?? null) : null
  const current = Math.min(playingStep ?? selected, Math.max(0, steps.length - 1))
  const step = steps[current]
  const voiced = session.voiced[current]
  const chord = voiced?.chord

  const ctx = { keyName, tuning }
  const lastNotes = () => session.voiced.at(-1)?.notes ?? null
  const hear = (notes) => {
    const pitches = notes.map((n) => n.pitch ?? tuning[n.string] + n.fret)
    if (pitches.length === 1) playPitch(pitches[0])
    else if (pitches.length) playChord(pitches)
  }

  // ---- Changing the progression ----
  const change = (next, undoText) => {
    setUndo(undoText ? { steps, text: undoText } : null)
    setSteps(next)
  }
  const select = (i) => {
    setSelected(i)
    if (!playing && session.voiced[i]) hear(session.voiced[i].notes)
  }
  const addChord = (c) => {
    const next = createStep({ rootPc: c.rootPc, type: c.type }, { ...ctx, kind, previous: lastNotes() })
    change([...steps, next])
    setSelected(steps.length)
    hear(voiceStep(next, keyName, tuning).notes)
  }
  const addTyped = (e) => {
    e.preventDefault()
    const { steps: added, errors } = stepsFromText(typed, { ...ctx, kind, previous: lastNotes() })
    if (added.length) {
      change([...steps, ...added])
      setSelected(steps.length)
      setTyped('')
    }
    setTypedError(errors.length ? `Couldn’t read ${errors.map((t) => `“${t}”`).join(', ')}. Try numerals (ii7 V7 I) or names (Am F C G).` : '')
  }
  const startFrom = (text) => {
    change(stepsFromText(text, { ...ctx, kind }).steps, steps.length ? 'Progression replaced.' : null)
    setSelected(0)
    setAdding(false)
  }
  const edit = (patch) => change(updateStep(steps, current, patch))
  const reorder = (next, index) => {
    change(next)
    setSelected(index)
  }

  // ---- Voicings ----
  const pickKind = (k) => {
    setKind(k)
    // Stay in the same part of the neck, so only the shape changes.
    const next = createStep({ rootPc: chord.rootPc, type: step.type }, { ...ctx, kind: k, previous: voiced.notes })
    edit({ kind: next.kind, index: next.index, frets: null })
    hear(voiceStep({ ...step, kind: next.kind, index: next.index, frets: null }, keyName, tuning).notes)
  }
  const stepVoicing = (delta) => {
    const count = voiced.voicings.length
    if (!count) return
    const index = (voiced.index + delta + count) % count
    edit({ index, frets: null })
    hear(voiced.voicings[index].notes)
  }
  const tapNote = (n) => {
    if (mode === 'scales' || !voiced) return playPitch(tuning[n.string] + n.fret)
    const frets = editVoicing(voiced.notes, n.string, n.fret)
    if (!frets) return
    edit({ frets, fretsKey: keyName })
    hear(frets)
  }

  // ---- What the neck shows ----
  const scale = SCALES[scaleType] ?? SCALES.major
  const scaleNames = useMemo(() => {
    const { root, names } = spellNotes(keyName, scale.intervals, true)
    return new Map(scale.intervals.map((i, k) => [mod12(noteToPc(root) + i), names[k]]))
  }, [keyName, scale])
  const chordNames = chord ? new Map(chord.intervals.map((i, k) => [mod12(chord.rootPc + i), spellNotes(chord.rootName, chord.intervals).names[k]])) : new Map()
  const pcOf = (n) => mod12(tuning[n.string] + n.fret)
  const noteLabel = (n) => {
    const pc = pcOf(n)
    if (labels === 'intervals' && chord) return intervalName(mod12(pc - chord.rootPc), chord.intervals)
    return chordNames.get(pc) ?? scaleNames.get(pc) ?? pcName(pc, usesFlats(keyName))
  }
  const activeColumn = practiceActive !== null ? session.columns[practiceActive] : null
  const neckNotes = (() => {
    if (!chord) return []
    const pcs = new Set(chord.intervals.map((i) => mod12(chord.rootPc + i)))
    const interval = (n) => mod12(pcOf(n) - chord.rootPc)
    const map = new Map()
    // Scale notes outside the chord are plain grey, so only the chord's own notes carry a role.
    const add = (n, level) => map.set(`${n.string}-${n.fret}`, { string: n.string, fret: n.fret, level, interval: interval(n), ...(pcs.has(pcOf(n)) ? {} : { role: 'other' }) })
    if (mode === 'scales') {
      const pos = session.positions[position]?.notes ?? []
      pos.forEach((n) => add(n, pcs.has(pcOf(n)) ? 'shape' : 'path'))
      if (activeColumn && session.owner[practiceActive] === current) activeColumn.notes.forEach((n) => add(n, 'active'))
    } else {
      findPositions(tuning, [...pcs]).forEach((n) => add(n, 'faint'))
      voiced.notes.forEach((n) => add(n, 'shape'))
    }
    const order = { faint: 0, path: 1, shape: 2, active: 3 }
    return [...map.values()].sort((a, b) => order[a.level] - order[b.level])
  })()
  const canZoom = Boolean(zoomWindow(neckNotes.filter((n) => n.level === 'shape' || n.level === 'active' || (mode === 'scales' && n.level === 'path')).map((n) => n.fret)))
  const zoomed = narrow && zoomPref && canZoom
  const stringName = (s) => pcName(tuning[s], tuningSpec.flats ?? usesFlats(keyName))
  const tuningNames = tabStringNames(tuning, stringName)

  const selectColumn = (i) => {
    setPracticeActive(i)
    setSelected(session.owner[i] ?? 0)
    const col = session.columns[i]
    if (col) hear(col.notes)
  }
  const toggle = () => (playing ? player.stopPractice() : player.startPractice())
  const bars = steps.reduce((sum, s) => sum + s.beats, 0) / 4
  const settingsSummary = [CHORD_STYLES.find((c) => c.value === chordStyle)?.label ?? 'Strum', playLine ? 'line plays' : 'line silent', player.drone ? `drone ${keyName}` : null, tuningSpec.name].filter(Boolean).join(' · ')

  return (
    <section className="page practice-page">
      <PageHeader title="Practice" summary="Build a progression, shape each chord, and play scales through it." />

      {/* 1. The key and its scale: everything below follows them. Changing the key moves the whole progression. */}
      <div className="explore-setup">
        <KeyPicker value={keyName} onChange={onKeyChange} />
        <div className="explore-row">
          <Field label="Scale / mode" className="scale-field">
            <select value={scaleType} onChange={(e) => onScaleChange(e.target.value)}>
              {Object.entries(SCALES).map(([id, s]) => (
                <option key={id} value={id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Choice label="Practise" options={PRACTICE_MODES} value={mode} onChange={setMode} className="view-choice" />
        </div>
      </div>

      {/* 2. The progression: one card per chord, like a chart. Tap one to change it below. */}
      <section className="prog" aria-labelledby="prog-title">
        <div className="prog-head">
          <h2 id="prog-title">
            Progression
            <small>{steps.length ? `${steps.length} ${steps.length === 1 ? 'chord' : 'chords'} · ${bars % 1 ? bars.toFixed(1) : bars} ${bars === 1 ? 'bar' : 'bars'}` : 'add chords to start'}</small>
          </h2>
          <Menu
            label="Common progressions"
            items={[
              ...PROGRESSIONS.map((p) => ({ label: p.name, detail: p.text, onSelect: () => startFrom(p.text) })),
              { separator: true },
              { label: 'Random progression', onSelect: () => startFrom(randomProgression(progressionMood(scaleType), 4)) },
            ]}
          >
            Common ▾
          </Menu>
          {steps.length > 0 && (
            <Menu label="Progression actions" items={[{ label: 'Clear the progression', destructive: true, onSelect: () => change([], 'Progression cleared.') }]}>
              ⋯
            </Menu>
          )}
        </div>

        {undo && (
          <p className="prog-undo" role="status">
            {undo.text}{' '}
            <button type="button" className="link-button" onClick={() => {
                setSteps(undo.steps)
                setUndo(null)
              }}>
              Undo
            </button>
          </p>
        )}

        <ol className="prog-chart">
          {steps.map((s, i) => {
            const c = session.voiced[i]?.chord
            return (
              <li key={s.id}>
                <button type="button" className={`prog-chord${i === current ? ' on' : ''}${playingStep === i ? ' is-playing' : ''}`} onClick={() => select(i)} aria-pressed={i === current} aria-label={`${c?.name}, ${c?.numeral}, ${beatsText(s.beats)}`}>
                  <strong>{c?.name}</strong>
                  <span>
                    {c?.numeral}
                    {s.beats !== 4 && ` · ${s.beats}`}
                  </span>
                </button>
              </li>
            )
          })}
          <li>
            <button type="button" className={`prog-add${adding ? ' on' : ''}`} onClick={() => setAdding(!adding)} aria-expanded={adding}>
              {adding ? 'Done' : '＋ Add'}
            </button>
          </li>
        </ol>

        {adding && (
          <div className="prog-add-panel">
            <DiatonicChords keyName={keyName} scaleId={scaleType} sevenths={sevenths} onSeventhsChange={setSevenths} silent onPick={addChord} pickHint="add to the progression" title="Tap to add" />
            <form className="prog-type" onSubmit={addTyped}>
              <Field label="Or type chords" hint="numerals or names">
                <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="ii7 V7 Imaj7  ·  Am F C G" autoCapitalize="off" autoCorrect="off" spellCheck="false" enterKeyHint="done" />
              </Field>
              {/* Keep the keyboard up while pressing Add: the tab bar coming back would cover the button mid-tap. */}
              <button type="submit" disabled={!typed.trim()} onMouseDown={(e) => e.preventDefault()}>
                Add
              </button>
            </form>
            {typedError && (
              <p className="field-error" role="alert">
                {typedError}
              </p>
            )}
          </div>
        )}

        {steps.length > 0 && (
          <div className="playback prog-transport">
            <button className="primary" onClick={toggle}>
              {playing ? '■ Stop' : '▶ Play'}
            </button>
            <Stepper label="BPM" value={bpm} onChange={setBpm} min={30} max={300} step={5} fallback={100} className="bpm-field" />
            <Choice label="Backing" options={BACKINGS} value={player.backing} onChange={player.setBacking} size="small" className="backing-choice" />
          </div>
        )}
        {steps.length > 0 && player.backing === 'groove' && (
          <p className="hint backing-note">
            Drums: <strong>{currentGroove(bpm).name}</strong>, on the same beat. <a href="#drums">Change the groove</a>
          </p>
        )}
      </section>

      {/* 3. The chord on the neck: its voicing (Chords) or the scale position around it (Scales). */}
      {chord && (
        <div className="stage prog-stage">
          <div className="title-row">
            <h2>
              {chord.name}
              <small>
                {chord.numeral} · {beatsText(step.beats)}
                {mode === 'scales' && ` · position ${position + 1}`}
              </small>
            </h2>
            <div className="prog-stage-tools">
              {narrow && canZoom && (
                <button type="button" className="neck-zoom-button" onClick={() => setZoomPref(!zoomPref)} aria-pressed={!zoomPref}>
                  {zoomPref ? 'Whole neck' : 'Zoom in'}
                </button>
              )}
              <Menu
                label={`${chord.name} actions`}
                items={[
                  { label: 'Move earlier', disabled: current === 0, onSelect: () => reorder(moveStep(steps, current, -1), current - 1) },
                  { label: 'Move later', disabled: current === steps.length - 1, onSelect: () => reorder(moveStep(steps, current, 1), current + 1) },
                  { label: 'Duplicate', onSelect: () => reorder(duplicateStep(steps, current), current + 1) },
                  { separator: true },
                  { label: `Remove ${chord.name}`, destructive: true, onSelect: () => change(removeStep(steps, current), `${chord.name} removed.`) },
                ]}
              >
                ⋯
              </Menu>
            </div>
          </div>

          {mode === 'chords' ? (
            <Choice label="Voicing" options={voiced.kinds} value={voiced.kind} onChange={pickKind} className="voicing-choice" size="small" />
          ) : (
            <div className="prog-scale-row">
              <div className="field position-field">
                <span className="field-label" id="prog-position-label">
                  {scale.name} position
                </span>
                <div className="options position-options" role="group" aria-labelledby="prog-position-label">
                  {session.positions.map((p, i) => (
                    <button key={p.label} type="button" className={i === position ? 'on' : ''} aria-pressed={i === position} onClick={() => setPosition(i)}>
                      {p.label}
                      <small>{p.hint}</small>
                    </button>
                  ))}
                </div>
              </div>
              <Choice label="Line" options={LINE_KINDS} value={line} onChange={setLine} size="small" className="line-choice" />
            </div>
          )}

          <Fretboard zoom={zoomed} tuning={tuning} intervals={chord.intervals} notes={neckNotes} label={noteLabel} stringName={stringName} onNoteClick={tapNote} />

          {mode === 'chords' ? (
            <>
              <div className="voicing-stepper">
                <button type="button" onClick={() => stepVoicing(-1)} disabled={voiced.voicings.length < 2} aria-label="Previous voicing">
                  ‹
                </button>
                <p aria-live="polite">
                  {voiced.edited ? (
                    <>
                      <strong>Your voicing</strong>
                      <span>
                        <button type="button" className="link-button" onClick={() => edit({ frets: null })}>
                          Back to {voiced.voicings[voiced.index]?.label ?? 'the shape'}
                        </button>
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>{voiced.voicings[voiced.index]?.label ?? 'No voicings in this tuning'}</strong>
                      {voiced.voicings.length > 0 && (
                        <span>
                          {voiced.voicings[voiced.index].hint} · {voiced.index + 1} of {voiced.voicings.length}
                        </span>
                      )}
                    </>
                  )}
                </p>
                <button type="button" onClick={() => stepVoicing(1)} disabled={voiced.voicings.length < 2} aria-label="Next voicing">
                  ›
                </button>
              </div>
              <div className="prog-step-row">
                <Choice label="Beats" options={BEAT_CHOICES} value={step.beats} onChange={(b) => edit({ beats: b })} size="small" className="beats-choice" />
                <button type="button" className="link-button" onClick={() => change(revoiceAll(steps, { ...ctx, kind: voiced.kind }))}>
                  {voiced.kind === 'shapes' ? 'Voice every chord close together' : `Every chord as ${voiced.kinds.find((k) => k.value === voiced.kind)?.label}`}
                </button>
              </div>
              <p className="hint">Tap a dim note on the neck to move that string to it; tap a played note to mute its string.</p>
            </>
          ) : (
            <>
              <ul className="legend">
                {LEGEND.slice(0, chord.intervals.length >= 4 ? 4 : 3).map(([role, text]) => (
                  <li key={role}>
                    <span className={`swatch ${role}`} /> {text} of {chord.name}
                  </li>
                ))}
                <li>
                  <span className="swatch other" /> Rest of the scale
                </li>
              </ul>
              <p className="hint">Bright notes belong to {chord.name}. Land on one each time the chord changes.</p>
            </>
          )}
        </div>
      )}

      {/* 4. The whole progression as one tab, following the music. */}
      {steps.length > 0 && (
        <section className="prog-tab" aria-labelledby="prog-tab-title">
          <h2 id="prog-tab-title">
            Tab
            <small>{mode === 'scales' ? `${line === 'arpeggio' ? 'arpeggios' : 'the scale'} through the changes, 8th notes` : 'one chord per change'}</small>
          </h2>
          <Tab columns={session.columns} tuningNames={tuningNames} columnWidth={mode === 'scales' ? 28 : 52} active={practiceActive} onSelect={selectColumn} follow={playing} />
        </section>
      )}

      <Disclosure label="Settings" summary={settingsSummary} storageKey="music.practiceSettingsOpen">
        <div className="field-grid">
          <Choice label="Chords sound" options={CHORD_STYLES} value={chordStyle} onChange={setChordStyle} />
          <Toggle checked={playLine} onChange={setPlayLine}>
            Scales: play the line too
          </Toggle>
          <Toggle checked={player.drone} onChange={player.setDrone}>
            Drone on {keyName}
          </Toggle>
          <Choice label="Note labels" options={LABEL_OPTIONS} value={labels} onChange={setLabels} />
          <Field label="Tuning">
            <TuningSelect value={tuningId} onChange={onTuningChange} />
          </Field>
        </div>
      </Disclosure>

      <p className="page-hint">Changing the key moves the whole progression. Find more voicings on the Fretboard and add them with ＋ Add to progression.</p>
    </section>
  )
}
