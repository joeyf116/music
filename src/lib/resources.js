// Builds the resource catalog from files in /resources, /resources/links.json and shared links,
// plus the filtering, sorting and tag helpers the Resources page uses.

const FILE_TYPES = {
  pdf: 'PDF',
  png: 'Image', jpg: 'Image', jpeg: 'Image', gif: 'Image', webp: 'Image', svg: 'Image',
  txt: 'Text', md: 'Text',
  gp: 'Tab', gp3: 'Tab', gp4: 'Tab', gp5: 'Tab', gpx: 'Tab',
  mp3: 'Backing track', wav: 'Backing track', m4a: 'Backing track', ogg: 'Backing track',
  mid: 'MIDI', midi: 'MIDI',
  musicxml: 'Tab', mxl: 'Tab',
}

// Types offered when adding a link; anything else still displays fine.
export const RESOURCE_TYPES = ['Tab', 'Lesson', 'Video', 'Backing track', 'Tool', 'Article', 'PDF', 'Other']
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
export const MAX_TAGS = 8
export const NEW_FOR_DAYS = 14

// Only allow http(s) links (and same-site relative paths) so a bad entry can't run script.
export const safeUrl = (url) => {
  if (typeof url !== 'string' || !url.trim()) return null
  try {
    const parsed = new URL(url, globalThis.location?.href ?? 'https://localhost/')
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

export const prettifyFileName = (name) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())

/** "Blues, #riffs  ,blues" or ['Blues'] -> ['blues', 'riffs']: lower-case, de-duplicated, capped. */
export const normalizeTags = (tags) =>
  [
    ...new Set(
      (Array.isArray(tags) ? tags : String(tags ?? '').split(','))
        .map((t) => String(t).toLowerCase().replace(/\s+/g, ' ').trim().replace(/^#+\s*/, '').slice(0, 24))
        .filter(Boolean),
    ),
  ].slice(0, MAX_TAGS)

const guessType = (url) => {
  const u = url?.toLowerCase() ?? ''
  if (u.endsWith('.pdf')) return 'PDF'
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(u)) return 'Video'
  if (/songsterr\.com|ultimate-guitar\.com|tabs?\b/.test(u)) return 'Tab'
  return 'Link'
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Turn `{ '/resources/scales/caged.pdf': url }` into resource entries; sub-folders become categories. */
export const fileResources = (files) =>
  Object.entries(files)
    .filter(([path]) => !path.endsWith('/links.json') && !/\/README\.md$/i.test(path))
    .map(([path, url]) => {
      const parts = path.replace(/^\/?resources\//, '').split('/')
      const file = parts.pop()
      const ext = file.split('.').pop().toLowerCase()
      return {
        id: path,
        title: prettifyFileName(file),
        url,
        category: parts.length ? prettifyFileName(parts.join(' / ')) : 'Files',
        type: FILE_TYPES[ext] ?? ext.toUpperCase(),
        tags: normalizeTags(parts.map(prettifyFileName)),
        level: '',
        description: file,
        host: '',
        addedAt: '',
        source: 'repo',
      }
    })

export const linkResources = (links, source = 'repo') =>
  (Array.isArray(links) ? links : [])
    .map((link, i) => ({
      id: link.id != null ? `${source}-${link.id}` : `${source}-link-${i}-${link.url}`,
      index: i,
      sharedId: source === 'shared' ? link.id : undefined,
      title: String(link.title || link.url || 'Untitled'),
      url: safeUrl(link.url),
      category: String(link.category || 'Links'),
      type: link.type ? String(link.type) : guessType(link.url),
      tags: normalizeTags(link.tags),
      level: LEVELS.includes(link.level) ? link.level : '',
      description: link.description ? String(link.description) : '',
      host: hostOf(link.url),
      addedAt: link.created_at || link.addedAt || '',
      source,
    }))
    .filter((r) => r.url)

export const matchesQuery = (resource, query) => {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = [resource.title, resource.category, resource.description, resource.type, resource.level, resource.host, ...(resource.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return words.every((w) => haystack.includes(w))
}

/** Apply every catalog filter. Tags are AND-ed (pick "blues" + "beginner" to narrow down). */
export const filterResources = (resources, { query = '', types = [], tags = [], level = '', category = 'All', starredOnly = false, starred = [] } = {}) =>
  resources.filter(
    (r) =>
      (category === 'All' || r.category === category) &&
      (!types.length || types.includes(r.type)) &&
      (!level || r.level === level) &&
      tags.every((t) => r.tags?.includes(t)) &&
      (!starredOnly || starred.includes(r.url)) &&
      matchesQuery(r, query),
  )

export const SORTS = { category: 'Category', newest: 'Newest', title: 'A–Z' }

export const sortResources = (resources, sort) => {
  const list = [...resources]
  if (sort === 'title') return list.sort((a, b) => a.title.localeCompare(b.title))
  if (sort === 'newest') return list.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
  return list.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
}

/** [[tag, count], ...] most used first, for the tag cloud and add-form suggestions. */
export const tagCounts = (resources) =>
  Object.entries(
    resources.reduce((acc, r) => {
      for (const t of r.tags ?? []) acc[t] = (acc[t] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

export const isNew = (resource, now = Date.now()) =>
  Boolean(resource.addedAt) && now - Date.parse(resource.addedAt) < NEW_FOR_DAYS * 86_400_000

/** Search links for finding tabs and lessons for a song on other sites. */
export const tabSearchLinks = (query) => {
  const q = encodeURIComponent(query.trim())
  if (!q) return []
  return [
    { label: 'Songsterr', note: 'Interactive tabs', url: `https://www.songsterr.com/?pattern=${q}` },
    { label: 'Ultimate Guitar', note: 'Tabs & chords', url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${q}` },
    { label: 'YouTube', note: 'Video lessons', url: `https://www.youtube.com/results?search_query=${q}%20guitar%20lesson` },
  ]
}
