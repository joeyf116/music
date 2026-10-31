import { Stack } from 'expo-router'
import { colors } from '@/theme'

/** Fretboard tab: the page, plus its settings and pickers as sheets that slide up from the bottom. */
export default function FretboardLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Fretboard', headerLargeTitle: true, headerShadowVisible: false, headerLargeTitleShadowVisible: false }} />
      <Stack.Screen name="settings" options={{ title: 'Neck settings', presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.bg } }} />
      <Stack.Screen name="pick" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.bg } }} />
    </Stack>
  )
}
