import { useState } from 'react'
import { LEVELS, normalizeTags, RESOURCE_TYPES } from '../lib/resources.js'
import { LIMITS, validateSubmission } from '../lib/sharedResources.js'
import { Choice, Field } from './controls.jsx'

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
      <Field label="Link" className="wide">
        <input type="url" inputMode="url" placeholder="https://…" value={draft.url} onChange={set('url')} maxLength={LIMITS.url} required autoComplete="url" />
      </Field>
      <Field label="Title" className="wide">
        <input placeholder="e.g. Blackbird – full tab" value={draft.title} onChange={set('title')} maxLength={LIMITS.title} />
      </Field>
      <Field label="Type">
        <select value={draft.type} onChange={set('type')}>
          {RESOURCE_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Level">
        <select value={draft.level} onChange={set('level')}>
          <option value="">Any level</option>
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Category" className="category-field">
        <input list="resource-categories" placeholder="e.g. Songs" value={draft.category} onChange={set('category')} maxLength={LIMITS.category} />
        <datalist id="resource-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Tags" hint="comma separated, or tap below" className="wide">
        <input placeholder="e.g. fingerstyle, beatles, acoustic" value={draft.tags} onChange={set('tags')} autoCapitalize="off" />
      </Field>
      {popularTags.length > 0 && (
        <div className="wide tag-suggestions" aria-label="Popular tags">
          {popularTags.slice(0, 12).map(([t]) => (
            <button type="button" key={t} className={`tag${tags.includes(t) ? ' on' : ''}`} onClick={() => toggleTag(t)} aria-pressed={tags.includes(t)}>
              #{t}
            </button>
          ))}
        </div>
      )}
      <Field label="Note" hint="optional" className="wide">
        <input placeholder="What's good about it?" value={draft.description} onChange={set('description')} maxLength={LIMITS.description} />
      </Field>
      <label className="honeypot" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={draft.website} onChange={set('website')} />
      </label>
      <div className="wide add-actions">
        {canShare ? (
          <Choice
            label="Who can see it"
            options={[
              { value: true, label: 'Everyone' },
              { value: false, label: 'Just me' },
            ]}
            value={shareIt}
            onChange={setShareIt}
          />
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
