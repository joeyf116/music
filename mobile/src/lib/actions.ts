// A short list of actions for one thing (a chart, a link), as the platform shows them: an action sheet on iOS,
// an alert with buttons on Android.
import { ActionSheetIOS, Alert, Platform } from 'react-native'

export interface Action {
  label: string
  onPress: () => void
  destructive?: boolean
}

export function showActions(title: string, actions: Action[]): void {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [...actions.map((a) => a.label), 'Cancel'], cancelButtonIndex: actions.length, destructiveButtonIndex: actions.flatMap((a, i) => (a.destructive ? [i] : [])) },
      (index) => actions[index]?.onPress(),
    )
    return
  }
  // Android alerts hold three buttons (tapping outside cancels), so longer lists go on behind "More…".
  const shown = actions.length > 3 ? [...actions.slice(0, 2), { label: 'More…', onPress: () => showActions(title, actions.slice(2)) }] : actions
  Alert.alert(
    title,
    undefined,
    shown.map((a) => ({ text: a.label, onPress: a.onPress, style: 'destructive' in a && a.destructive ? 'destructive' : 'default' })),
    { cancelable: true },
  )
}

/** Asks before something that can't be undone. */
export function confirm(title: string, message: string, action: string, onConfirm: () => void): void {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ])
}
