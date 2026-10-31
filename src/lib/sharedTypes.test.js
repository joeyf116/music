// The iOS / Android app (mobile/) imports these modules through typed declarations in
// mobile/src/types/shared-music.d.ts. This checks every name declared there really is exported here, so renaming or
// removing a shared export can't silently break the app's types.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const declarations = readFileSync(new URL('../../mobile/src/types/shared-music.d.ts', import.meta.url), 'utf8')
const modules = [...declarations.matchAll(/declare module '@music\/([\w.]+)' \{([\s\S]*?)\n\}/g)]

describe('typed contract with the mobile app', () => {
  it('declares the shared modules', () => {
    expect(modules.map((m) => m[1])).toEqual(['theory.js', 'exercises.js', 'audio.js', 'fretboardView.js'])
  })

  it.each(modules.map((m) => [m[1], m[2]]))('%s exports everything the app declares', async (file, body) => {
    const actual = await import(`./${file}`)
    const declared = [...body.matchAll(/export (?:const|function) (\w+)/g)].map((m) => m[1])
    expect(declared.length).toBeGreaterThan(0)
    expect(declared.filter((name) => !(name in actual))).toEqual([])
  })
})
