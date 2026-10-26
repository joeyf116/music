import { describe, expect, it, vi } from 'vitest'
import { addSharedLink, fetchSharedLinks, removeSharedLink, reportSharedLink, sharingEnabled, validateSubmission } from './sharedResources.js'

const config = { url: 'https://demo.supabase.co', key: 'anon-key' }
const reply = (body, ok = true, status = 200) => vi.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(body) })

describe('shared resources', () => {
  it('is only on when both settings are present', () => {
    expect(sharingEnabled(config)).toBe(true)
    expect(sharingEnabled({ url: '', key: 'x' })).toBe(false)
  })

  it('validates and tidies submissions', () => {
    expect(validateSubmission({ url: 'javascript:alert(1)' }).error).toBeTruthy()
    expect(validateSubmission({ url: 'example.com' }).error).toBeTruthy()
    expect(validateSubmission({ url: 'https://x.com', title: 'a'.repeat(121) }).error).toMatch(/title/)
    expect(validateSubmission({ url: ' https://www.songsterr.com/a ', title: '  Riff  ', type: 'Tab', level: 'Pro', tags: 'Blues, blues' }).link).toEqual({
      title: 'Riff',
      url: 'https://www.songsterr.com/a',
      category: 'Shared links',
      type: 'Tab',
      level: '',
      tags: ['blues'],
      description: '',
    })
    expect(validateSubmission({ url: 'https://www.songsterr.com/a', type: 'Spam' }).link).toMatchObject({ title: 'songsterr.com', type: 'Other' })
  })

  it('reads links with the public key', async () => {
    const fetchImpl = reply([{ id: 1 }])
    expect(await fetchSharedLinks(config, fetchImpl)).toEqual([{ id: 1 }])
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toMatch(/^https:\/\/demo\.supabase\.co\/rest\/v1\/resources\?select=/)
    expect(init.headers.apikey).toBe('anon-key')
  })

  it('adds, removes and reports through database functions', async () => {
    const add = reply(7)
    const row = await addSharedLink({ title: 'T', url: 'https://x.com/' }, 'tok', config, add)
    expect(row).toMatchObject({ id: 7, title: 'T' })
    expect(add.mock.calls[0][0]).toBe('https://demo.supabase.co/rest/v1/rpc/add_resource')
    expect(JSON.parse(add.mock.calls[0][1].body)).toEqual({ title: 'T', url: 'https://x.com/', token: 'tok' })

    const remove = reply(true)
    expect(await removeSharedLink(7, 'tok', config, remove)).toBe(true)
    expect(JSON.parse(remove.mock.calls[0][1].body)).toEqual({ resource_id: 7, token: 'tok' })

    const report = reply(true)
    await reportSharedLink(7, 'spam', config, report)
    expect(report.mock.calls[0][0]).toMatch(/rpc\/report_resource$/)
  })

  it('explains duplicate and rate-limit errors', async () => {
    await expect(addSharedLink({}, 't', config, reply({ code: '23505' }, false, 409))).rejects.toThrow(/already in the catalog/)
    await expect(addSharedLink({}, 't', config, reply({ message: 'Too many new links, slow down' }, false, 400))).rejects.toThrow(/Try again in a few minutes/)
    await expect(fetchSharedLinks(config, reply({}, false, 500))).rejects.toThrow(/500/)
  })
})
