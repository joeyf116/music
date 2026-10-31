import { useId, useRef } from 'react'

/**
 * Tabs across the top of a page (ARIA tablist): arrow keys move between them, and each tab's panel is
 * rendered by the caller under it. tabs: [{ id, label, hint? }].
 */
export default function PageTabs({ label, tabs, value, onChange, children }) {
  const id = useId()
  const list = useRef(null)
  const onKeyDown = (e) => {
    const index = tabs.findIndex((t) => t.id === value)
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    const target = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : step ? (index + step + tabs.length) % tabs.length : null
    if (target === null) return
    e.preventDefault()
    onChange(tabs[target].id)
    list.current?.children[target]?.focus()
  }
  return (
    <>
      <div className="page-tabs" role="tablist" aria-label={label} ref={list} onKeyDown={onKeyDown}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${id}-${t.id}`}
            aria-selected={t.id === value}
            aria-controls={`${id}-panel`}
            tabIndex={t.id === value ? 0 : -1}
            onClick={() => onChange(t.id)}
          >
            <span>{t.label}</span>
            {t.hint && <small>{t.hint}</small>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${value}`} className="page-tab-panel">
        {children}
      </div>
    </>
  )
}
