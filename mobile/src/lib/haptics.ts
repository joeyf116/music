// Light taps that make choices feel physical, like the system controls.
import * as Haptics from 'expo-haptics'

const ignore = () => {}

export const selection = (): void => void Haptics.selectionAsync().catch(ignore)
export const impact = (): void => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore)
