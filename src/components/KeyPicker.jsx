import { useEffect, useId, useRef } from 'react'
import { KEYS } from '../lib/theory.js'

/** The twelve keys as one row of buttons (two rows on a phone, or one sideways-scrolling row where a page asks for it), shared by every page that has a key. */
export default function KeyPicker({ value, onChange, label = 'Key', className = '' }) {
  const id = useId()
  // Where the keys scroll sideways (one row on a phone), keep the chosen key in view.
  const row = useRef(null)
  useEffect(() => {
    const el = row.current
    const on = el?.querySelector('.on')
    if (!el || !on || el.scrollWidth <= el.clientWidth) return
    el.scrollLeft = on.offsetLeft - el.clientWidth / 2 + on.offsetWidth / 2
  }, [value])
  return (
    <div className={`field key-picker ${className}`.trim()}>
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="keys" role="group" ref={row} aria-labelledby={id}>
        {KEYS.map((k) => (
          <button key={k} type="button" className={k === value ? 'on' : ''} onClick={() => onChange(k)} aria-pressed={k === value}>
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
