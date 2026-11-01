import { Stack } from 'expo-router'
import type { ReactNode } from 'react'
import { colors } from '@/theme'

/** Options for a sheet that slides up from the bottom (pickers, settings, forms). */
export const SHEET = { presentation: 'formSheet' as const, sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.bg } }

/** One tab's navigation stack: its page with a large title, the shared list sheet (`choose`), and any extra screens. */
export default function TabStack({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerLargeTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title, headerLargeTitle: true, headerShadowVisible: false, headerLargeTitleShadowVisible: false }} />
      <Stack.Screen name="choose" options={SHEET} />
      {children}
    </Stack>
  )
}
