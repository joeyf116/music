import usePersistentState from '../lib/usePersistentState.js'

// Page building blocks, so every page is laid out the same way (see docs/DESIGN.md):
// PageHeader → setup → stage → Settings disclosure → reference → hint.

/** The top of every page: one h1, one sentence on what the page is for, and at most one main action. */
export function PageHeader({ title, summary, actions, status }) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        <h1>{title}</h1>
        {summary && <p className="page-summary">{summary}</p>}
      </div>
      {(actions || status) && (
        <div className="page-head-side">
          {status && (
            <p className="page-status" aria-live="polite">
              {status}
            </p>
          )}
          {actions}
        </div>
      )}
    </header>
  )
}

/**
 * Folded-away options. Shows its current values while closed, so nobody has to open it to know what is set.
 * `quiet` is the light, borderless version for optional help text ("Why practise this?").
 * Pass `storageKey` to remember whether it was left open, or `open`/`onToggle` to control it.
 */
export function Disclosure({ label, summary, storageKey, open, onToggle, defaultOpen = false, quiet = false, className = '', children }) {
  const [ownOpen, setOwnOpen] = usePersistentState(storageKey ?? null, defaultOpen)
  const controlled = open !== undefined
  const isOpen = controlled ? open : ownOpen
  const setOpen = controlled ? onToggle : setOwnOpen
  return (
    <details
      className={`disclosure${quiet ? ' disclosure-quiet' : ''} ${className}`.trim()}
      open={isOpen}
      onToggle={(e) => {
        if (e.currentTarget.open !== isOpen) setOpen?.(e.currentTarget.open)
      }}
    >
      <summary>
        <span className="disclosure-label">{label}</span>
        {summary && <span className="disclosure-summary">{summary}</span>}
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  )
}

/** A titled block inside a page. The title is an h2; `aside` sits on the right (a toggle, a count). */
export function Section({ title, sub, aside, className = '', children, ...rest }) {
  return (
    <section className={`section ${className}`.trim()} {...rest}>
      {(title || aside) && (
        <div className="section-title">
          {title && (
            <h2>
              {title}
              {sub && <small>{sub}</small>}
            </h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}
