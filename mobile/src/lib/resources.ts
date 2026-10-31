// The Resources catalog: the repo's links (resources/links.json, the same file the web site lists), the shared
// catalog when sharing is set up, and links saved on this device, under the web site's storage keys.
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import links from '@resources/links.json'
import { linkResources, type Link, type Resource } from '@music/resources.js'
import { COOLDOWN_MS, addSharedLink, fetchSharedLinks, removeSharedLink, reportSharedLink } from '@music/sharedResources.js'
import { useStored } from './prefs'
import { CAN_SHARE, SHARED, newToken } from './sharing'
import type { SharedStatus } from './charts'

// Files dropped into /resources are bundled by the web site only; the app lists the links.
const REPO_RESOURCES = linkResources(links)
const REPO_URLS = new Set(REPO_RESOURCES.map((r) => r.url))

type SharedLink = Link & { id: string; created_at: string }
let rows: SharedLink[] = []
let status: SharedStatus = CAN_SHARE ? 'loading' : 'off'
let started = false
const listeners = new Set<() => void>()
const setRows = (next: SharedLink[], nextStatus: SharedStatus = status) => {
  rows = next
  status = nextStatus
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export interface Resources {
  all: Resource[]
  status: SharedStatus
  starred: string[]
  toggleStar: (resource: Resource) => void
  /** Removable: saved here, or shared from this device. */
  canRemove: (resource: Resource) => boolean
  canReport: (resource: Resource) => boolean
  add: (link: Link, share: boolean) => Promise<void>
  remove: (resource: Resource) => Promise<void>
  report: (resource: Resource) => Promise<void>
}

export function useResources(): Resources {
  const [saved, setSaved] = useStored<Link[]>('music.savedLinks', [])
  const [starred, setStarred] = useStored<string[]>('music.starredResources', [])
  const [mine, setMine] = useStored<Record<string, string>>('music.mySharedLinks', {})
  const [lastShared, setLastShared] = useStored('music.lastSharedAt', 0)
  const shared = useSyncExternalStore(subscribe, () => rows)
  const sharedStatus = useSyncExternalStore(subscribe, () => status)

  useEffect(() => {
    if (!CAN_SHARE || started) return
    started = true
    fetchSharedLinks(SHARED)
      .then((r) => setRows(r, 'ok'))
      .catch(() => setRows(rows, 'error'))
  }, [])

  // Repo links win over a shared copy of the same URL.
  const all = useMemo(() => [...REPO_RESOURCES, ...linkResources(shared, 'shared').filter((r) => !REPO_URLS.has(r.url)), ...linkResources(saved, 'local')], [shared, saved])

  const add = async (link: Link, share: boolean) => {
    if (!share || !CAN_SHARE) {
      setSaved([...saved, link])
      return
    }
    const wait = lastShared + COOLDOWN_MS - Date.now()
    if (wait > 0) throw new Error(`You just shared a link. Try again in ${Math.ceil(wait / 1000)} seconds.`)
    const token = newToken()
    const row = await addSharedLink(link, token, SHARED)
    setLastShared(Date.now())
    setMine({ ...mine, [row.id]: token })
    setRows([row, ...rows], 'ok')
  }

  const remove = async (r: Resource) => {
    if (r.source === 'local') {
      setSaved(saved.filter((_, i) => i !== r.index))
      return
    }
    if (!r.sharedId) return
    await removeSharedLink(r.sharedId, mine[r.sharedId], SHARED)
    setRows(rows.filter((row) => row.id !== r.sharedId))
    const rest = { ...mine }
    delete rest[r.sharedId]
    setMine(rest)
  }

  return {
    all,
    status: sharedStatus,
    starred,
    toggleStar: (r) => setStarred(starred.includes(r.url) ? starred.filter((u) => u !== r.url) : [...starred, r.url]),
    canRemove: (r) => r.source === 'local' || (r.source === 'shared' && Boolean(r.sharedId && mine[r.sharedId])),
    canReport: (r) => r.source === 'shared' && !(r.sharedId && mine[r.sharedId]),
    add,
    remove,
    report: async (r) => {
      if (r.sharedId) await reportSharedLink(r.sharedId, 'Reported from the app', SHARED)
    },
  }
}
