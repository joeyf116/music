// The shared catalog (links and charts anyone can add) lives in Supabase, like on the web site. The app is pointed
// at the same project with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see mobile/README.md); without
// them sharing is simply off and everything is saved on the device.
import { randomUUID } from 'expo-crypto'
import { sharingEnabled, type SharedConfig } from '@music/sharedResources.js'

export const SHARED: SharedConfig = {
  url: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, ''),
  key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

export const CAN_SHARE = sharingEnabled(SHARED)

/** A random secret kept on the device, so whoever shared something can change or remove it again. */
export const newToken = (): string => randomUUID()
