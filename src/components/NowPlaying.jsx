import { usePlayer } from '../lib/usePlayer.jsx'

const scrollToPracticeTab = () => document.getElementById('practice-tab')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

/**
 * The bar above the phone's tab bar: what's playing, with Stop, on every page, so music keeps going while you look
 * something up. On the Fretboard it is also the practice tab's Play button. Wider screens show it only while
 * something plays away from its own page.
 */
export default function NowPlaying({ page }) {
  const player = usePlayer()
  const { groove, practicePlaying, items, bpm } = player
  const practiceLabel = `${items.length} ${items.length === 1 ? 'item' : 'items'}`

  let bar = null
  if (practicePlaying) {
    bar = {
      title: 'Practice tab',
      detail: `${practiceLabel} · ${bpm} BPM${player.backing === 'groove' && groove.name ? ` · ${groove.name}` : ''}`,
      open: page === 'fretboard' ? scrollToPracticeTab : () => (window.location.hash = 'fretboard'),
      playing: true,
      away: page !== 'fretboard',
    }
  } else if (groove.playing) {
    bar = { title: groove.name || 'Groove', detail: `Drums · ${bpm} BPM`, open: () => (window.location.hash = 'drums'), playing: true, away: page !== 'drums' }
  } else if (page === 'fretboard' && items.length) {
    bar = { title: 'Practice tab', detail: practiceLabel, open: scrollToPracticeTab, playing: false, away: false }
  }
  if (!bar) return null

  // On the Drums page the groove's own Play button is right there: no bar needed.
  if (!bar.away && page === 'drums') return null

  const toggle = () => (bar.playing ? player.stopAll() : player.startPractice())
  return (
    <div className={`now-playing${bar.away ? ' is-away' : ''}`} role="region" aria-label="Now playing">
      <button type="button" className="now-playing-open" onClick={bar.open}>
        <strong>{bar.title}</strong>
        <span>{bar.detail}</span>
      </button>
      <button type="button" className="primary" onClick={toggle} aria-label={bar.playing ? `Stop ${bar.title}` : `Play ${bar.title}`}>
        {bar.playing ? '■' : '▶'}
      </button>
    </div>
  )
}
