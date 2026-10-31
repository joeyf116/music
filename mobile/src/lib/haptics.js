// Light taps that make choices feel physical, like the system controls.
import * as Haptics from 'expo-haptics'

export const selection = () => Haptics.selectionAsync().catch(() => {})
export const impact = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
