// Colours and sizes, matching the web site's tokens (src/index.css) so both feel like one product.
import { Platform } from 'react-native'

export const colors = {
  bg: '#12151b',
  surface: '#1b2029',
  surface2: '#232a35',
  field: '#161a21',
  border: '#2e3644',
  borderStrong: '#6b778b',
  text: '#e8ebf1',
  muted: '#9aa4b5',
  accent: '#f0a033',
  accentSoft: 'rgba(240, 160, 51, 0.16)',
  onAccent: '#1b1307',
  danger: '#ff8b8e',
  // Note roles on the neck
  root: '#e5484d',
  third: '#3e9bff',
  fifth: '#30a46c',
  seventh: '#a86ee8',
  other: '#c9a227',
  wood: '#4a2f1d',
} as const

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 } as const

export const text = { xs: 12, sm: 14, base: 16, lg: 18, xl: 22 } as const

export const mono: string = Platform.select({ ios: 'Menlo', default: 'monospace' })

// Thumb-sized: Apple asks for 44pt, Material for 48dp.
export const touch: number = Platform.select({ ios: 44, default: 48 })
