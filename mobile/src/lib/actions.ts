// Asking before something that can't be undone. Lists of actions are native menus (components/Menu.tsx).
import { Alert } from 'react-native'

/** Asks before something that can't be undone. */
export function confirm(title: string, message: string, action: string, onConfirm: () => void): void {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ])
}
