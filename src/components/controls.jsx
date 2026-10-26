import { useId } from 'react'

// Shared form controls, so every page asks for input the same way: a short label above the control,
// big enough to hit with a thumb, and the right kind of control for the number of choices
// (a few short options are all shown as a segmented choice; longer lists use a dropdown).

/** A labelled field: small label above, control below. Wraps one select or input. */
export function Field({ label, hint, className = '', children }) {
  return (
    <label className={`field ${className}`.trim()}>
      <span className="field-label">
        {label}
        {hint && <span className="field-hint"> {hint}</span>}
      </span>
      {children}
    </label>
  )
}

/**
 * Pick one of a few options, all visible at once (segmented control).
 * Built from radio buttons, so arrow keys and screen readers work as for any radio group.
 * options: [{ value, label, title? }] or plain strings.
 */
export function Choice({ label, hideLabel = false, options, value, onChange, size, className = '' }) {
  const id = useId()
  const items = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }))
  const group = (
    <div className={`choice${size ? ` ${size}` : ''}`} role="radiogroup" aria-labelledby={hideLabel ? undefined : `${id}-label`} aria-label={hideLabel ? label : undefined}>
      {items.map((o) => (
        <label key={String(o.value)} title={o.title}>
          <input type="radio" name={id} checked={o.value === value} onChange={() => onChange(o.value)} disabled={o.disabled} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
  if (hideLabel) return <div className={className || undefined}>{group}</div>
  return (
    <div className={`field ${className}`.trim()}>
      <span className="field-label" id={`${id}-label`}>
        {label}
      </span>
      {group}
    </div>
  )
}

/**
 * A number with − / + buttons either side, for tempos and frets: tap to nudge, or type a value.
 * Typing keeps whatever digits are entered; leaving the box snaps the value back into range.
 */
export function Stepper({ label, hideLabel = false, value, onChange, min, max, step = 1, fallback = min, className = '' }) {
  const id = useId()
  const clamp = (n) => Math.max(min, Math.min(max, n))
  const current = Number(value)
  const valid = value !== '' && Number.isFinite(current)
  const bump = (d) => onChange(clamp((valid ? current : fallback) + d))
  return (
    <div className={`field stepper-field ${className}`.trim()}>
      <span className={hideLabel ? 'visually-hidden' : 'field-label'} id={`${id}-label`}>
        {label}
      </span>
      <div className="stepper">
        <button type="button" onClick={() => bump(-step)} disabled={valid && current <= min} aria-label={`${label} down ${step}`}>
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          value={value}
          aria-labelledby={`${id}-label`}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, String(max).length))}
          onBlur={() => onChange(clamp(valid ? current : fallback))}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              bump(e.key === 'ArrowUp' ? 1 : -1)
            }
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
        <button type="button" onClick={() => bump(step)} disabled={valid && current >= max} aria-label={`${label} up ${step}`}>
          +
        </button>
      </div>
    </div>
  )
}

/** An on/off setting that takes effect straight away, shown as a switch. */
export function Toggle({ checked, onChange, disabled, children }) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="toggle-track" aria-hidden="true" />
      <span className="toggle-text">{children}</span>
    </label>
  )
}
