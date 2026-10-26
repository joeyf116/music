import { describe, expect, it } from 'vitest'
import { fileResources, linkResources, matchesQuery, prettifyFileName, safeUrl } from './resources.js'

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
      ['Backing', 'Files', 'Audio'],
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

  it('searches title, category, description and type', () => {
    const r = { title: 'Caged', category: 'Chords', description: 'shapes', type: 'PDF' }
    expect(matchesQuery(r, 'chord')).toBe(true)
    expect(matchesQuery(r, 'pdf')).toBe(true)
    expect(matchesQuery(r, '  ')).toBe(true)
    expect(matchesQuery(r, 'jazz')).toBe(false)
  })
})
