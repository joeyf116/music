import { CLICK_SOUNDS, SOUND_FAMILIES, previewSound } from '../lib/clickSounds.js'
import { Field } from './controls.jsx'

/** Metronome sound: natural and digital voices in one grouped list, plus a button to hear it. */
export default function SoundPicker({ value, onChange, volume }) {
  return (
    <Field label="Sound" className="sound-field">
      <div className="sound-picker">
        <select
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            previewSound(e.target.value, volume)
          }}
        >
          {SOUND_FAMILIES.map((family) => (
            <optgroup key={family} label={family}>
              {CLICK_SOUNDS.filter((s) => s.family === family).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" onClick={() => previewSound(value, volume)} aria-label="Hear this sound">
          🔊
        </button>
      </div>
    </Field>
  )
}

/** All the voices as one-tap chips, grouped by family, for the metronome's sound panel. */
export function SoundChips({ value, onChange, volume }) {
  return (
    <div className="sound-chips">
      {SOUND_FAMILIES.map((family) => (
        <div key={family} className="sound-family" role="group" aria-label={`${family} sounds`}>
          <span className="field-label">{family}</span>
          <div className="chips-row">
            {CLICK_SOUNDS.filter((s) => s.family === family).map((s) => (
              <button
                key={s.id}
                type="button"
                className={s.id === value ? 'on' : ''}
                aria-pressed={s.id === value}
                onClick={() => {
                  onChange(s.id)
                  previewSound(s.id, volume)
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
