import '@/lib/setup'
import { DarkTheme, ThemeProvider } from 'expo-router'
import { NativeTabs } from 'expo-router/native-tabs'
import { StatusBar } from 'expo-status-bar'
import { colors } from '@/theme'

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, text: colors.text, border: colors.border } }

/** The app's five pages as the platform's own tab bar (UITabBar on iOS, Material navigation bar on Android). */
export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <NativeTabs tintColor={colors.accent} backgroundColor={colors.surface} indicatorColor={colors.accentSoft} iconColor={{ default: colors.muted, selected: colors.accent }} labelStyle={{ default: { color: colors.muted }, selected: { color: colors.text } }}>
        <NativeTabs.Trigger name="(fretboard)">
          <NativeTabs.Trigger.Label>Fretboard</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="guitars" md="grid_on" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="rhythm">
          <NativeTabs.Trigger.Label>Rhythm</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="metronome" md="timer" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="ear">
          <NativeTabs.Trigger.Label>Ear</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="ear" md="hearing" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="charts">
          <NativeTabs.Trigger.Label>Charts</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'music.note.list', selected: 'music.note.list' }} md="queue_music" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="resources">
          <NativeTabs.Trigger.Label>Resources</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }} md="menu_book" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  )
}
