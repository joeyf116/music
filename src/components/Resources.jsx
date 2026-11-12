import { useEffect, useMemo, useState } from 'react'
import links from '../../resources/links.json'
import { fileResources, filterResources, LEVELS, linkResources, SORTS, sortResources, tagCounts } from '../lib/resources.js'
import { displayName } from '../lib/auth.js'
import { COOLDOWN_MS, fetchSharedLinks, removeMyLink, removeSharedLink, reportSharedLink, shareLink, sharingEnabled } from '../lib/sharedResources.js'
import { getSupabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/useAuth.jsx'
import usePersistentState from '../lib/usePersistentState.js'
import AddResource from './AddResource.jsx'
import { Field } from './controls.jsx'
import ResourceCard from './ResourceCard.jsx'
import TabFinder from './TabFinder.jsx'
import { Disclosure } from './layout.jsx'

// Any file dropped into /resources (sub-folders become categories) is bundled and listed here.
const files = import.meta.glob(
  ['/resources/**/*.{pdf,PDF,png,jpg,jpeg,gif,webp,svg,txt,md,gp,gp3,gp4,gp5,gpx,mp3,wav,m4a,ogg,mid,midi,musicxml,mxl}', '!/resources/README.md'],
  { query: '?url&no-inline', import: 'default', eager: true },
)
const REPO_RESOURCES = [...fileResources(files), ...linkResources(links)]
const CAN_SHARE = sharingEnabled()
const NO_FILTERS = { query: '', types: [], tags: [], level: '', category: 'All', starredOnly: false }
const TAG_CLOUD_SIZE = 18
// Below this many links, search and the type chips are all the filtering anyone needs.
const MORE_FILTERS_FROM = 20

const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

/** The Links view of the Community page: lessons, tabs, videos and tools, from the repo and shared by members. */
export default function Resources() {
  const [saved, setSaved] = usePersistentState('music.savedLinks', [])
  const [starred, setStarred] = usePersistentState('music.starredResources', [])
  // Links shared before accounts, { [id]: ownerToken }, so they can still be removed (synced with your account).
  const [mine, setMine] = usePersistentState('music.mySharedLinks', {})
  // Sharing with everyone needs an account, so every shared link has a name on it.
  const auth = useAuth()
  const me = auth.status === 'signedIn' ? auth.user : null
  const canShare = CAN_SHARE && Boolean(me)
  const isMine = (r) => r.source === 'shared' && ((me && r.owner === me.id) || Boolean(mine[r.sharedId]))
  const accessToken = async () => (await (await getSupabase()).auth.getSession()).data.session?.access_token
  const [lastShared, setLastShared] = usePersistentState('music.lastSharedAt', 0)
  const [sort, setSort] = usePersistentState('music.resourceSort', 'category')
  const [shared, setShared] = useState([])
  const [sharedStatus, setSharedStatus] = useState(CAN_SHARE ? 'loading' : 'off')
  const [filters, setFilters] = useState(NO_FILTERS)
  const [adding, setAdding] = useState(false)
  const [allTags, setAllTags] = useState(false)
  const [notice, setNotice] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (!CAN_SHARE) return
    let live = true
    fetchSharedLinks()
      .then((rows) => live && (setShared(rows), setSharedStatus('ok')))
      .catch(() => live && setSharedStatus('error'))
    return () => {
      live = false
    }
  }, [])

  const all = useMemo(() => {
    // Repo links win over a shared copy of the same URL.
    const repoUrls = new Set(REPO_RESOURCES.map((r) => r.url))
    return [...REPO_RESOURCES, ...linkResources(shared, 'shared').filter((r) => !repoUrls.has(r.url)), ...linkResources(saved, 'local')]
  }, [shared, saved])

  const categories = useMemo(() => [...new Set(all.map((r) => r.category))].sort(), [all])
  const typeCounts = useMemo(() => Object.entries(all.reduce((acc, r) => ((acc[r.type] = (acc[r.type] ?? 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]), [all])
  const tags = useMemo(() => tagCounts(all), [all])
  // Sorting is one of the folded-away filters: with only a few links, they stay grouped by category.
  const sortBy = all.length >= MORE_FILTERS_FROM && SORTS[sort] ? sort : 'category'
  const visible = sortResources(filterResources(all, { ...filters, starred }), sortBy)
  const grouped = sortBy === 'category' ? visible.reduce((acc, r) => ((acc[r.category] ??= []).push(r), acc), {}) : { '': visible }
  const filtering = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)
  const extraCount = (filters.level ? 1 : 0) + (filters.category !== 'All' ? 1 : 0) + filters.tags.length
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const tagFilter = (t) => set({ tags: toggle(filters.tags, t) })
  // Keep chosen tags visible in the cloud even when they're rarely used.
  const cloud = allTags ? tags : [...tags.slice(0, TAG_CLOUD_SIZE), ...tags.slice(TAG_CLOUD_SIZE).filter(([t]) => filters.tags.includes(t))]

  const addLink = async (link, share) => {
    if (!share) return setSaved([...saved, link])
    const wait = lastShared + COOLDOWN_MS - Date.now()
    if (wait > 0) throw new Error(`You just shared a link. Try again in ${Math.ceil(wait / 1000)} seconds.`)
    const token = await accessToken()
    if (!token) throw new Error('Log in to share a link with everyone.')
    const row = await shareLink(link, token, { id: me.id, name: displayName(me, auth.profile) })
    setLastShared(Date.now())
    setShared((rows) => [row, ...rows])
  }

  const removeLink = async (r) => {
    if (r.source === 'local') return setSaved(saved.filter((_, i) => i !== r.index))
    if (!window.confirm(`Remove "${r.title}" for everyone?`)) return
    try {
      const removed = me && r.owner === me.id ? await removeMyLink(r.sharedId, await accessToken()) : await removeSharedLink(r.sharedId, mine[r.sharedId])
      if (removed === false) throw new Error("That link couldn't be removed. Log in with the account that shared it.")
      setShared((rows) => rows.filter((row) => row.id !== r.sharedId))
      const { [r.sharedId]: _gone, ...rest } = mine
      setMine(rest)
    } catch (err) {
      setNotice(err.message)
    }
  }

  const reportLink = async (r) => {
    try {
      await reportSharedLink(r.sharedId, 'Reported from the Community links')
      setNotice('Thanks, the link was reported.')
    } catch (err) {
      setNotice(err.message)
    }
  }

  const star = (r) => setStarred(toggle(starred, r.url))

  return (
    <div className="resources">
      <TabFinder
        onAdd={() => {
          setAdding(true)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />

      {adding && <AddResource canShare={canShare} needsLogin={CAN_SHARE && !me} categories={categories} popularTags={tags} onSubmit={addLink} onClose={() => setAdding(false)} />}

      <div className="catalog-controls">
        <div className="search-row">
          <input
            type="search"
            className="catalog-search"
            placeholder="Search titles, tags, sites, notes…"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            aria-label="Search resources"
            enterKeyHint="search"
          />
          <button type="button" className="primary" onClick={() => setAdding(!adding)} aria-expanded={adding}>
            + Add a link
          </button>
        </div>
        <div className="type-chips" role="group" aria-label="Filter by type">
          {typeCounts.map(([type, count]) => (
            <button type="button" key={type} className={`filter-chip${filters.types.includes(type) ? ' on' : ''}`} aria-pressed={filters.types.includes(type)} onClick={() => set({ types: toggle(filters.types, type) })}>
              {type} <span>{count}</span>
            </button>
          ))}
          <button type="button" className={`filter-chip${filters.starredOnly ? ' on' : ''}`} aria-pressed={filters.starredOnly} onClick={() => set({ starredOnly: !filters.starredOnly })}>
            ★ Starred <span>{all.filter((r) => starred.includes(r.url)).length}</span>
          </button>
        </div>
        {/* Sort, level, category and tags fold away, and only appear once there are enough links to need them. */}
        {all.length >= MORE_FILTERS_FROM && (
          <Disclosure label="More filters" summary={extraCount > 0 ? `${extraCount} on` : `Sort: ${SORTS[sortBy].toLowerCase()} · level, category, tags`} open={moreOpen} onToggle={setMoreOpen} className="more-filters">
            <div className="more-filters-body">
              <div className="field-grid">
                <Field label="Sort">
                  <select value={sortBy} onChange={(e) => setSort(e.target.value)}>
                    {Object.entries(SORTS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Level">
                  <select value={filters.level} onChange={(e) => set({ level: e.target.value })}>
                    <option value="">Any level</option>
                    {LEVELS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Category">
                  <select value={categories.includes(filters.category) ? filters.category : 'All'} onChange={(e) => set({ category: e.target.value })}>
                    <option value="All">All categories</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
              {tags.length > 0 && (
                <div className="field">
                  <span className="field-label" id="resource-tags-label">
                    Tags
                  </span>
                  <div className="tag-cloud" role="group" aria-labelledby="resource-tags-label">
                    {cloud.map(([t, count]) => (
                      <button type="button" key={t} className={`tag${filters.tags.includes(t) ? ' on' : ''}`} aria-pressed={filters.tags.includes(t)} onClick={() => tagFilter(t)}>
                        #{t} <span>{count}</span>
                      </button>
                    ))}
                    {tags.length > TAG_CLOUD_SIZE && (
                      <button type="button" className="link-button" onClick={() => setAllTags(!allTags)}>
                        {allTags ? 'Fewer tags' : `All ${tags.length} tags`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Disclosure>
        )}
      </div>

      <p className="results-count" aria-live="polite">
        {visible.length === all.length ? `${all.length} links` : `${visible.length} of ${all.length} links`}
        {sharedStatus === 'loading' && ' · loading shared links…'}
        {sharedStatus === 'error' && " · shared links couldn't be loaded right now"}
        {filtering && (
          <>
            {' · '}
            <button type="button" className="link-button" onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </button>
          </>
        )}
      </p>

      {notice && (
        <p className="notice" role="status">
          {notice}{' '}
          <button type="button" className="link-button" onClick={() => setNotice('')}>
            Dismiss
          </button>
        </p>
      )}

      {visible.length === 0 && (
        <div className="empty">
          <p>Nothing matches those filters yet.</p>
          {filtering && (
            <button type="button" onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </button>
          )}{' '}
          <button type="button" onClick={() => setAdding(true)}>
            Add one
          </button>
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="resource-group">
          {cat && (
            <h2>
              {cat} <span>{items.length}</span>
            </h2>
          )}
          <ul className="resource-list">
            {items.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                starred={starred.includes(r.url)}
                onStar={star}
                onTag={tagFilter}
                activeTags={filters.tags}
                onRemove={r.source === 'local' || isMine(r) ? removeLink : undefined}
                onReport={r.source === 'shared' && !isMine(r) ? reportLink : undefined}
              />
            ))}
          </ul>
        </div>
      ))}

    </div>

  )
}
