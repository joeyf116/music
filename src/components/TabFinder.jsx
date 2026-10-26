import { useState } from 'react'
import { tabSearchLinks } from '../lib/resources.js'

// Look a song up on the big tab sites, then add the best find to the catalog.
export default function TabFinder({ onAdd }) {
  const [song, setSong] = useState('')
  const links = tabSearchLinks(song)
  return (
    <div className="tab-finder">
      <label htmlFor="tab-finder-input">
        <strong>Find tabs for a song</strong>
      </label>
      <input id="tab-finder-input" type="search" enterKeyHint="search" placeholder="Song or artist, e.g. Wonderwall" value={song} onChange={(e) => setSong(e.target.value)} />
      {links.length > 0 && (
        <ul className="finder-links">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                {l.label} <span>{l.note}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <small>
        Found a good one?{' '}
        <button type="button" className="link-button" onClick={onAdd}>
          Add it to the catalog
        </button>{' '}
        so everyone can find it.
      </small>
    </div>
  )
}
