import { isNew } from '../lib/resources.js'
import Menu from './Menu.jsx'

// One catalog entry: opens the link, shows type/level/tags, and offers a star plus a ⋯ menu (report, remove).
export default function ResourceCard({ resource: r, starred, onStar, onTag, activeTags, onRemove, onReport }) {
  return (
    <li className="resource-card">
      <div className="resource-meta">
        <span className={`badge badge-${r.type.toLowerCase().replace(/\W+/g, '-')}`}>{r.type}</span>
        {r.level && <span className="badge badge-level">{r.level}</span>}
        {isNew(r) && <span className="badge badge-new">New</span>}
        {r.source === 'local' && <span className="badge badge-mine" title="Saved in this browser only">Only me</span>}
      </div>
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="resource-link">
        <span className="resource-title">{r.title}</span>
        {r.host && <span className="resource-host">{r.host}</span>}
        {r.description && <span className="resource-desc">{r.description}</span>}
      </a>
      {r.tags.length > 0 && (
        <ul className="tag-list" aria-label="Tags">
          {r.tags.map((t) => (
            <li key={t}>
              <button type="button" className={`tag${activeTags.includes(t) ? ' on' : ''}`} onClick={() => onTag(t)} aria-pressed={activeTags.includes(t)}>
                #{t}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="resource-actions">
        <button type="button" className={`icon-button star${starred ? ' on' : ''}`} onClick={() => onStar(r)} aria-pressed={starred} aria-label={`${starred ? 'Unstar' : 'Star'} ${r.title}`} title={starred ? 'Starred' : 'Star'}>
          {starred ? '★' : '☆'}
        </button>
        {(onRemove || onReport) && (
          <Menu
            label={`More for ${r.title}`}
            buttonClassName="icon-button"
            items={[
              onReport && { label: 'Report spam or a broken link', onSelect: () => onReport(r) },
              onRemove && { label: r.source === 'local' ? 'Remove' : 'Remove for everyone', destructive: true, onSelect: () => onRemove(r) },
            ]}
          />
        )}
      </div>
    </li>
  )
}
