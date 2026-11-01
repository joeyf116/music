import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

/**
 * A menu button (WAI-ARIA menu button pattern): a button that opens a short list of actions for one thing, such as
 * ⋯ on a chart or a link, or a list of presets to start from. The web version of the app's native pull-down menus.
 *
 * items: [{ label, onSelect, destructive?, disabled? }], with `{ heading }` for a group title and `{ separator: true }`
 * between groups. Destructive items go last, in red; anything that can't be undone still asks before it happens.
 * Arrow keys move, Home / End jump, Escape closes and returns focus to the button; clicking outside closes it.
 */
export default function Menu({ label, children, items, className = '', buttonClassName = '' }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState('start')
  const root = useRef(null)
  const trigger = useRef(null)
  const list = useRef(null)
  const shown = items.filter(Boolean)

  const entries = () => [...(list.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? [])]
  const focusAt = (index) => {
    const all = entries()
    all[(index + all.length) % all.length]?.focus()
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) trigger.current?.focus()
  }

  // Open towards whichever side has room, so the list never runs off a phone screen.
  useLayoutEffect(() => {
    if (!open || !trigger.current || !list.current) return
    const { left, right } = trigger.current.getBoundingClientRect()
    const width = list.current.offsetWidth
    setSide(left + width <= window.innerWidth - 8 || right - width < 8 ? 'start' : 'end')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    entries()[0]?.focus()
    const outside = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  const onKeyDown = (e) => {
    const all = entries()
    const index = all.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') focusAt(index + 1)
    else if (e.key === 'ArrowUp') focusAt(index - 1)
    else if (e.key === 'Home') focusAt(0)
    else if (e.key === 'End') focusAt(all.length - 1)
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab') return close(false)
    else return
    e.preventDefault()
  }

  if (!shown.length) return null
  return (
    <div className={`menu ${className}`.trim()} ref={root}>
      <button
        type="button"
        ref={trigger}
        className={`menu-button ${buttonClassName}`.trim()}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-label={label}
        title={children ? undefined : label}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        {children ?? <span aria-hidden="true">⋯</span>}
      </button>
      {open && (
        <div className={`menu-list menu-${side}`} role="menu" id={`${id}-menu`} aria-label={label} ref={list} onKeyDown={onKeyDown}>
          {shown.map((item, i) =>
            item.separator ? (
              <div key={i} className="menu-separator" role="separator" />
            ) : item.heading ? (
              <div key={i} className="menu-heading" role="presentation">
                {item.heading}
              </div>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={`menu-item${item.destructive ? ' danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  close()
                  item.onSelect()
                }}
              >
                <span>{item.label}</span>
                {item.detail && <small>{item.detail}</small>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
