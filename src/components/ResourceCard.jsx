import { isNew } from '../lib/resources.js'

// One catalog entry: opens the link, shows type/level/tags, and offers star / remove / report.
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
        {onRemove && (
          <button type="button" className="icon-button" onClick={() => onRemove(r)} aria-label={`Remove ${r.title}`} title="Remove">
            ×
          </button>
        )}
        {onReport && (
          <button type="button" className="icon-button report" onClick={() => onReport(r)} aria-label={`Report ${r.title} as spam or broken`} title="Report spam or a broken link">
            ⚑
          </button>
        )}
      </div>
    </li>
  )
}
