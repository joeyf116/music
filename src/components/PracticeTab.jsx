import { useState } from 'react'
import { PROGRESSIONS, randomProgression } from '../lib/exercises.js'
import { BEAT_OPTIONS, moveItem, practiceColumns, removeItem, setItemBeats } from '../lib/practiceTab.js'
import { TUNINGS } from '../lib/theory.js'
import { Stepper, Toggle } from './controls.jsx'
import Menu from './Menu.jsx'
import Tab from './Tab.jsx'

/**
 * The practice tab: everything pinned from the neck, as one tab that loops. Playback state lives in the page
 * (the phone's practice bar shares it); this is the list, the tab and the transport.
 */
export default function PracticeTab({ items, onItemsChange, onStartFrom, mood, playing, onTogglePlay, active, onSelectColumn, bpm, onBpmChange, click, onClickChange, drone, onDroneChange, droneName, tuningId, tuningNames, cleared, onUndoClear }) {
  const [open, setOpen] = useState(null)
  const { columns, owner } = practiceColumns(items)
  const activeItem = active === null ? null : owner[active]
  const tuningName = (id) => TUNINGS[id]?.name ?? id

  const progressionMenu = (text) => (
    <Menu
      label={text}
      items={[
        { heading: 'Common progressions' },
        ...PROGRESSIONS.map((p) => ({ label: p.name, detail: p.text, onSelect: () => onStartFrom(p.text) })),
        { separator: true },
        { label: 'Random progression', onSelect: () => onStartFrom(randomProgression(mood, 4)) },
      ]}
    >
      {text} ▾
    </Menu>
  )

  return (
    <section className="stage practice-tab" id="practice-tab" aria-labelledby="practice-tab-title">
      <div className="tab-head">
        <h2 id="practice-tab-title">
          Practice tab
          <small>{items.length ? `${items.length} ${items.length === 1 ? 'item' : 'items'}, looped` : 'pin voicings to build one'}</small>
        </h2>
        {items.length > 0 && (
          <Menu
            label="Practice tab actions"
            items={[
              { label: 'Clear the practice tab', destructive: true, onSelect: () => onItemsChange([]) },
            ]}
          >
            ⋯
          </Menu>
        )}
      </div>

      {cleared && (
        <p className="practice-cleared" role="status">
          Practice tab cleared. <button type="button" onClick={onUndoClear}>Undo</button>
        </p>
      )}

      {items.length === 0 ? (
        <div className="practice-empty">
          <p>Find a voicing or scale position on the neck and tap <strong>Pin</strong>. Pinned items play here one after another, on a loop.</p>
          {progressionMenu('Start from a progression')}
        </div>
      ) : (
        <>
          <div className="playback">
            <Stepper label="BPM" value={bpm} onChange={onBpmChange} min={30} max={300} step={5} fallback={100} className="bpm-field" />
            <button className="primary" onClick={onTogglePlay}>
              {playing ? '■ Stop' : '▶ Play'}
            </button>
            <Toggle checked={click} onChange={onClickChange}>
              Click
            </Toggle>
            <Toggle checked={drone} onChange={onDroneChange}>
              Drone {droneName}
            </Toggle>
          </div>

          <ol className="practice-items">
            {items.map((item, i) => (
              <li key={item.id} className={`practice-item${activeItem === i ? ' is-playing' : ''}`}>
                <button type="button" className="practice-item-name" onClick={() => onSelectColumn(owner.indexOf(i))} aria-label={`Hear ${item.name}, ${item.detail}`}>
                  <strong>{item.name}</strong>
                  <span>
                    {item.detail}
                    {item.tuningId !== tuningId && ` · pinned in ${tuningName(item.tuningId)}`}
                  </span>
                </button>
                <div className="practice-item-tools">
                  {item.kind === 'chord' && (
                    <button type="button" className="beats-button" onClick={() => setOpen(open === item.id ? null : item.id)} aria-expanded={open === item.id} aria-label={`${item.beats} beats, change`}>
                      {item.beats} {item.beats === 1 ? 'beat' : 'beats'}
                    </button>
                  )}
                  <button type="button" onClick={() => onItemsChange(moveItem(items, i, -1))} disabled={i === 0} aria-label={`Move ${item.name} earlier`}>
                    ‹
                  </button>
                  <button type="button" onClick={() => onItemsChange(moveItem(items, i, 1))} disabled={i === items.length - 1} aria-label={`Move ${item.name} later`}>
                    ›
                  </button>
                  <button type="button" onClick={() => onItemsChange(removeItem(items, i))} aria-label={`Remove ${item.name}`}>
                    ×
                  </button>
                </div>
                {open === item.id && (
                  <div className="beat-options" role="group" aria-label={`How long ${item.name} rings`}>
                    {BEAT_OPTIONS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        className={b === item.beats ? 'on' : ''}
                        aria-pressed={b === item.beats}
                        onClick={() => {
                          onItemsChange(setItemBeats(items, i, b))
                          setOpen(null)
                        }}
                      >
                        {b} {b === 1 ? 'beat' : 'beats'}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>

          <Tab columns={columns} tuningNames={tuningNames} columnWidth={44} active={active} onSelect={onSelectColumn} follow={playing} />
          <div className="practice-foot">
            <p className="hint">Tap an item or a tab column to hear it. ‹ › change the order.</p>
            {progressionMenu('Add a progression')}
          </div>
        </>
      )}
    </section>
  )
}
