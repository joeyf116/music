// The Supabase client, used for accounts. It is loaded only when needed (someone opens Account, or already
// has a saved session), so visitors who never log in don't download it.
import { sharedConfig, sharingEnabled } from './sharedResources.js'

export const authEnabled = () => sharingEnabled(sharedConfig)

let clientPromise = null

export function getSupabase() {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(sharedConfig.url, sharedConfig.key, {
      auth: {
        // PKCE puts the email-link result in ?code= rather than the #hash, which this site uses for pages.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }),
  )
  return clientPromise
}
