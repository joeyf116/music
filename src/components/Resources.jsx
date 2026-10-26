import { useMemo, useState } from 'react'
import links from '../../resources/links.json'
import { fileResources, linkResources, matchesQuery, safeUrl } from '../lib/resources.js'
import usePersistentState from '../lib/usePersistentState.js'

// Any file dropped into /resources (sub-folders become categories) is bundled and listed here.
const files = import.meta.glob(
  ['/resources/**/*.{pdf,PDF,png,jpg,jpeg,gif,webp,svg,txt,md,gp,gp3,gp4,gp5,gpx,mp3,wav,m4a,ogg,mid,midi,musicxml,mxl}', '!/resources/README.md'],
  { query: '?url&no-inline', import: 'default', eager: true },
)
const REPO_RESOURCES = [...fileResources(files), ...linkResources(links)]

export default function Resources() {
  const [saved, setSaved] = usePersistentState('music.savedLinks', [])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [draft, setDraft] = useState({ title: '', url: '', category: '' })
  const [error, setError] = useState('')

  const all = useMemo(() => [...REPO_RESOURCES, ...linkResources(saved, 'local')], [saved])
  const categories = useMemo(() => ['All', ...new Set(all.map((r) => r.category))], [all])
  const visible = all.filter((r) => (category === 'All' || r.category === category) && matchesQuery(r, query))
  const grouped = visible.reduce((acc, r) => ((acc[r.category] ??= []).push(r), acc), {})

  const addLink = (e) => {
    e.preventDefault()
    const url = safeUrl(draft.url.trim())
    if (!url) return setError('Enter a valid http(s) URL.')
    setSaved([...saved, { title: draft.title.trim() || url, url, category: draft.category.trim() || 'My links' }])
    setDraft({ title: '', url: '', category: draft.category })
    setError('')
  }

  const removeLink = (resource) => setSaved(saved.filter((_, i) => i !== resource.index))

  return (
    <section className="panel resources" id="resources">
      <div className="section-head">
        <h2>Practice resources</h2>
        <div className="resource-filters">
          <input type="search" placeholder="Search resources…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search resources" />
          <select value={categories.includes(category) ? category : 'All'} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {Object.keys(grouped).length === 0 && <p className="empty">No resources match. Add PDFs to the <code>resources/</code> folder or save a link below.</p>}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="resource-group">
          <h3>{cat}</h3>
          <ul className="resource-list">
            {items.map((r) => (
              <li key={r.id} className="resource-card">
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  <span className={`badge badge-${r.type.toLowerCase().replace(/\W+/g, '-')}`}>{r.type}</span>
                  <span className="resource-title">{r.title}</span>
                  {r.description && <span className="resource-desc">{r.description}</span>}
                </a>
                {r.source === 'local' && (
                  <button type="button" className="icon-button" onClick={() => removeLink(r)} aria-label={`Remove ${r.title}`} title="Remove">
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <form className="add-link" onSubmit={addLink}>
        <strong>Quick-save a link</strong>
        <input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Link title" />
        <input placeholder="https://…" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} aria-label="Link URL" required />
        <input placeholder="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} aria-label="Link category" />
        <button type="submit">Save</button>
        {error && <span className="error">{error}</span>}
        <small>Saved links live in this browser only. To keep PDFs/links permanently, add them to the <code>resources/</code> folder in the repo.</small>
      </form>
    </section>
  )
}
