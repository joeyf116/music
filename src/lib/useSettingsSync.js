import { useEffect, useRef } from 'react'
import { applyRemote, collectLocal, onLocalChange, plan, readMarker, SYNC_EVENT, tooBig, writeMarker } from './settingsSync.js'
import { getSupabase } from './supabaseClient.js'
import { useAuth } from './useAuth.jsx'

const PUSH_DELAY_MS = 2000

/**
 * While you're logged in, keeps this browser's settings and your account's in step: on log in and whenever
 * you come back to the tab it checks the account, and a couple of seconds after you change a setting it saves.
 * Logged out, it does nothing and settings stay in this browser as before.
 */
export default function useSettingsSync() {
  const { status, user } = useAuth()
  const userId = status === 'signedIn' ? user?.id : null
  const dirty = useRef(false)

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    let timer = null
    let busy = Promise.resolve()
    // One request at a time, so a quick pull and push can't overtake each other.
    const queue = (fn) => (busy = busy.then(fn).catch(() => {}))

    const push = () =>
      queue(async () => {
        const data = collectLocal()
        if (cancelled || tooBig(data)) return
        dirty.current = false
        const sb = await getSupabase()
        const { data: row, error } = await sb.from('user_settings').upsert({ user_id: userId, data }).select('updated_at').single()
        if (error) dirty.current = true
        else writeMarker(userId, row.updated_at)
      })

    const check = () =>
      queue(async () => {
        const sb = await getSupabase()
        const { data: row, error } = await sb.from('user_settings').select('data, updated_at').eq('user_id', userId).maybeSingle()
        if (cancelled || error) return
        const next = plan(row, readMarker(), userId, dirty.current)
        if (next === 'pull') {
          const keys = applyRemote(row.data)
          writeMarker(userId, row.updated_at)
          if (keys.length) window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { keys } }))
        } else if (next === 'push') {
          dirty.current = true
          push()
        }
      })

    const stopListening = onLocalChange(() => {
      dirty.current = true
      clearTimeout(timer)
      timer = setTimeout(push, PUSH_DELAY_MS)
    })
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
      // Leaving the tab: save now rather than lose the last change.
      else if (dirty.current) {
        clearTimeout(timer)
        push()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    check()

    return () => {
      cancelled = true
      clearTimeout(timer)
      stopListening()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId])
}
