import { useState } from 'react'
import { LEVELS, normalizeTags, RESOURCE_TYPES } from '../lib/resources.js'
import { LIMITS, validateSubmission } from '../lib/sharedResources.js'

const EMPTY = { url: '', title: '', type: 'Tab', level: '', category: '', tags: '', description: '', website: '' }

// Form for adding a link to the catalog, either shared with everyone or kept in this browser.
export default function AddResource({ canShare, categories, popularTags, onSubmit, onClose }) {
  const [draft, setDraft] = useState(EMPTY)
  const [shareIt, setShareIt] = useState(canShare)
  const [status, setStatus] = useState({ busy: false, error: '', done: '' })
  const set = (field) => (e) => setDraft({ ...draft, [field]: e.target.value })
  const tags = normalizeTags(draft.tags)

  const toggleTag = (t) => setDraft({ ...draft, tags: (tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]).join(', ') })

  const submit = async (e) => {
    e.preventDefault()
    // Bots fill every field; people never see this one.
    if (draft.website) return setStatus({ busy: false, error: '', done: 'Thanks!' })
    const { link, error } = validateSubmission(draft)
    if (error) return setStatus({ busy: false, error, done: '' })
    setStatus({ busy: true, error: '', done: '' })
    try {
      await onSubmit(link, shareIt && canShare)
      setDraft({ ...EMPTY, type: draft.type, category: draft.category })
      setStatus({ busy: false, error: '', done: shareIt && canShare ? 'Shared! Everyone can see it now.' : 'Saved in this browser.' })
    } catch (err) {
      setStatus({ busy: false, error: err.message, done: '' })
    }
  }

  return (
    <form className="add-resource" onSubmit={submit}>
      <div className="add-head">
        <h3>Add a resource</h3>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close the add form">
          ×
        </button>
      </div>
      <label className="wide">
        Link
        <input type="url" inputMode="url" placeholder="https://…" value={draft.url} onChange={set('url')} maxLength={LIMITS.url} required />
      </label>
      <label className="wide">
        Title
        <input placeholder="e.g. Blackbird – full tab" value={draft.title} onChange={set('title')} maxLength={LIMITS.title} />
      </label>
      <label>
        Type
        <select value={draft.type} onChange={set('type')}>
          {RESOURCE_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Level
        <select value={draft.level} onChange={set('level')}>
          <option value="">Any level</option>
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        Category
        <input list="resource-categories" placeholder="e.g. Songs" value={draft.category} onChange={set('category')} maxLength={LIMITS.category} />
        <datalist id="resource-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label className="wide">
        <span>
          Tags <span className="hint">comma separated</span>
        </span>
        <input placeholder="e.g. fingerstyle, beatles, acoustic" value={draft.tags} onChange={set('tags')} />
      </label>
      {popularTags.length > 0 && (
        <div className="wide tag-suggestions" aria-label="Popular tags">
          {popularTags.slice(0, 12).map(([t]) => (
            <button type="button" key={t} className={`tag${tags.includes(t) ? ' on' : ''}`} onClick={() => toggleTag(t)} aria-pressed={tags.includes(t)}>
              #{t}
            </button>
          ))}
        </div>
      )}
      <label className="wide">
        <span>
          Note <span className="hint">optional</span>
        </span>
        <input placeholder="What's good about it?" value={draft.description} onChange={set('description')} maxLength={LIMITS.description} />
      </label>
      <label className="honeypot" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={draft.website} onChange={set('website')} />
      </label>
      <div className="wide add-actions">
        {canShare ? (
          <div className="segmented small" role="group" aria-label="Who can see it">
            <button type="button" className={shareIt ? 'on' : ''} aria-pressed={shareIt} onClick={() => setShareIt(true)}>
              Everyone
            </button>
            <button type="button" className={shareIt ? '' : 'on'} aria-pressed={!shareIt} onClick={() => setShareIt(false)}>
              Just me
            </button>
          </div>
        ) : (
          <small>Shared links aren't switched on yet, so this is saved in this browser only.</small>
        )}
        <button type="submit" className="primary" disabled={status.busy}>
          {status.busy ? 'Adding…' : 'Add'}
        </button>
        <span role="status" className={status.error ? 'error' : 'done'}>
          {status.error || status.done}
        </span>
      </div>
    </form>
  )
}
