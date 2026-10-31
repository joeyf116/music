import { useId } from 'react'
import { KEYS } from '../lib/theory.js'

/** The twelve keys as one row of buttons (two rows on a phone), shared by every page that has a key. */
export default function KeyPicker({ value, onChange, label = 'Key', className = '' }) {
  const id = useId()
  return (
    <div className={`field key-picker ${className}`.trim()}>
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="keys" role="group" aria-labelledby={id}>
        {KEYS.map((k) => (
          <button key={k} type="button" className={k === value ? 'on' : ''} onClick={() => onChange(k)} aria-pressed={k === value}>
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
