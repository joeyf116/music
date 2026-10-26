import { describe, expect, it } from 'vitest'
import {
  fileResources,
  filterResources,
  isNew,
  linkResources,
  matchesQuery,
  normalizeTags,
  prettifyFileName,
  safeUrl,
  sortResources,
  tabSearchLinks,
  tagCounts,
} from './resources.js'

describe('resources', () => {
  it('only allows http(s) URLs', () => {
    expect(safeUrl('https://example.com/a.pdf')).toBe('https://example.com/a.pdf')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('data:text/html,hi')).toBeNull()
    expect(safeUrl('')).toBeNull()
    expect(safeUrl(undefined)).toBeNull()
  })

  it('prettifies file names', () => {
    expect(prettifyFileName('caged-system_notes.pdf')).toBe('Caged System Notes')
  })

  it('turns bundled files into resources, using sub-folders as categories', () => {
    const result = fileResources({
      '/resources/caged.pdf': '/assets/caged-123.pdf',
      '/resources/Scales/modes-cheat-sheet.pdf': '/assets/modes-456.pdf',
      '/resources/backing.mp3': '/assets/backing.mp3',
    })
    expect(result.map((r) => [r.title, r.category, r.type])).toEqual([
      ['Caged', 'Files', 'PDF'],
      ['Modes Cheat Sheet', 'Scales', 'PDF'],
      ['Backing', 'Files', 'Backing track'],
    ])
  })

  it('normalises links and drops unsafe ones', () => {
    const result = linkResources([
      { title: 'Lesson', url: 'https://example.com', category: 'Lessons' },
      { title: 'Bad', url: 'javascript:alert(1)' },
      { url: 'https://example.com/book.pdf' },
    ])
    expect(result.map((r) => [r.title, r.category, r.type, r.index])).toEqual([
      ['Lesson', 'Lessons', 'Link', 0],
      ['https://example.com/book.pdf', 'Links', 'PDF', 2],
    ])
    expect(linkResources(null)).toEqual([])
  })

  it('searches title, category, description, type, tags and site, matching every word', () => {
    const r = { title: 'Caged', category: 'Chords', description: 'shapes', type: 'PDF', tags: ['blues'], host: 'songsterr.com' }
    expect(matchesQuery(r, 'chord')).toBe(true)
    expect(matchesQuery(r, 'pdf')).toBe(true)
    expect(matchesQuery(r, 'blues songsterr')).toBe(true)
    expect(matchesQuery(r, 'blues jazz')).toBe(false)
    expect(matchesQuery(r, '  ')).toBe(true)
    expect(matchesQuery(r, 'jazz')).toBe(false)
  })

  it('normalises tags', () => {
    expect(normalizeTags('Blues, #riffs  ,blues,, ')).toEqual(['blues', 'riffs'])
    expect(normalizeTags(['Open  G', 'open g'])).toEqual(['open g'])
    expect(normalizeTags(Array.from({ length: 12 }, (_, i) => `t${i}`))).toHaveLength(8)
    expect(normalizeTags(undefined)).toEqual([])
  })

  it('guesses link types and keeps tags, level and site', () => {
    const [video, tab] = linkResources([
      { title: 'Lesson', url: 'https://youtu.be/abc', level: 'Beginner', tags: 'Strumming' },
      { title: 'Song', url: 'https://www.songsterr.com/a/wsa/song', level: 'Expert' },
    ])
    expect([video.type, video.level, video.tags]).toEqual(['Video', 'Beginner', ['strumming']])
    expect([tab.type, tab.level, tab.host]).toEqual(['Tab', '', 'songsterr.com'])
  })

  const catalog = linkResources([
    { title: 'B blues', url: 'https://a.com/1', category: 'Songs', type: 'Tab', level: 'Beginner', tags: ['blues', 'riffs'], created_at: '2026-01-02' },
    { title: 'A jazz', url: 'https://a.com/2', category: 'Theory', type: 'Lesson', tags: ['jazz'], created_at: '2026-03-01' },
    { title: 'C blues', url: 'https://a.com/3', category: 'Songs', type: 'Lesson', tags: ['blues'] },
  ])

  it('filters by type, tags (all of them), level, category and stars', () => {
    const titles = (filters) => filterResources(catalog, filters).map((r) => r.title)
    expect(titles({ types: ['Lesson'] })).toEqual(['A jazz', 'C blues'])
    expect(titles({ tags: ['blues'] })).toEqual(['B blues', 'C blues'])
    expect(titles({ tags: ['blues', 'riffs'] })).toEqual(['B blues'])
    expect(titles({ level: 'Beginner' })).toEqual(['B blues'])
    expect(titles({ category: 'Theory' })).toEqual(['A jazz'])
    expect(titles({ starredOnly: true, starred: ['https://a.com/3'] })).toEqual(['C blues'])
    expect(titles({})).toHaveLength(3)
  })

  it('sorts by category, title or newest', () => {
    expect(sortResources(catalog, 'title').map((r) => r.title)).toEqual(['A jazz', 'B blues', 'C blues'])
    expect(sortResources(catalog, 'newest').map((r) => r.title)).toEqual(['A jazz', 'B blues', 'C blues'])
    expect(sortResources(catalog, 'category').map((r) => r.title)).toEqual(['B blues', 'C blues', 'A jazz'])
  })

  it('counts tags, most used first', () => {
    expect(tagCounts(catalog)).toEqual([
      ['blues', 2],
      ['jazz', 1],
      ['riffs', 1],
    ])
  })

  it('marks recently added links as new', () => {
    const now = Date.parse('2026-03-05')
    expect(isNew(catalog[1], now)).toBe(true)
    expect(isNew(catalog[0], now)).toBe(false)
    expect(isNew(catalog[2], now)).toBe(false)
  })

  it('builds tab search links for a song', () => {
    expect(tabSearchLinks('  ')).toEqual([])
    expect(tabSearchLinks('Wish you were here')[0].url).toBe('https://www.songsterr.com/?pattern=Wish%20you%20were%20here')
  })
})
