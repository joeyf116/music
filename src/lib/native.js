// Small touches for the iOS / Android app builds (Capacitor). On the web this does nothing.
import { Capacitor } from '@capacitor/core'

export const isNativeApp = () => Capacitor.isNativePlatform()

export async function setUpNativeShell() {
  if (!isNativeApp()) return
  document.documentElement.classList.add('native-app')
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // Light text on the app's dark background; the page already pads for the notch with safe-area insets.
    await StatusBar.setStyle({ style: Style.Dark })
    if (Capacitor.getPlatform() === 'android') await StatusBar.setOverlaysWebView({ overlay: true })
  } catch {
    // Status bar plugin unavailable (e.g. iPad split view quirks); the app still works.
  }
}
