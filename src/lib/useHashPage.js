import { useEffect, useState } from 'react'

const readHash = () => window.location.hash.replace(/^#\/?/, '')

// Picks the page named in the URL hash (e.g. #resources) so pages work on GitHub Pages without a router.
export default function useHashPage(pages, fallback) {
  const [hash, setHash] = useState(readHash)

  useEffect(() => {
    const onChange = () => {
      setHash(readHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return pages.includes(hash) ? hash : fallback
}
