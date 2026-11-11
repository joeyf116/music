import { useEffect, useState } from 'react'

const readHash = () => window.location.hash.replace(/^#\/?/, '')

// Picks the page named in the URL hash (e.g. #resources) so pages work on GitHub Pages without a router.
// `moved` maps old page names to where they live now (e.g. { exercises: 'drums' }), so old bookmarks still land somewhere sensible.
export default function useHashPage(pages, fallback, moved = {}) {
  const [hash, setHash] = useState(readHash)
  const target = moved[hash]

  useEffect(() => {
    const onChange = () => {
      setHash(readHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  // Rewrite the address to the page's new name, so a copied link shows it too.
  useEffect(() => {
    if (target) window.history.replaceState(null, '', `#${target}`)
  }, [target])

  const page = target ?? hash
  return pages.includes(page) ? page : fallback
}
