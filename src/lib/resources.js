// Builds the resource library from files in /resources plus /resources/links.json.

const FILE_TYPES = {
  pdf: 'PDF',
  png: 'Image', jpg: 'Image', jpeg: 'Image', gif: 'Image', webp: 'Image', svg: 'Image',
  txt: 'Text', md: 'Text',
  gp: 'Guitar Pro', gp3: 'Guitar Pro', gp4: 'Guitar Pro', gp5: 'Guitar Pro', gpx: 'Guitar Pro',
  mp3: 'Audio', wav: 'Audio', m4a: 'Audio', ogg: 'Audio',
  mid: 'MIDI', midi: 'MIDI',
  musicxml: 'MusicXML', mxl: 'MusicXML',
}

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
        description: file,
        source: 'repo',
      }
    })

export const linkResources = (links, source = 'repo') =>
  (Array.isArray(links) ? links : [])
    .map((link, i) => ({
      id: `${source}-link-${i}-${link.url}`,
      index: i,
      title: String(link.title || link.url || 'Untitled'),
      url: safeUrl(link.url),
      category: String(link.category || 'Links'),
      type: link.type ? String(link.type) : link.url?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Link',
      description: link.description ? String(link.description) : '',
      source,
    }))
    .filter((r) => r.url)

export const matchesQuery = (resource, query) => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [resource.title, resource.category, resource.description, resource.type].some((v) => v?.toLowerCase().includes(q))
}
