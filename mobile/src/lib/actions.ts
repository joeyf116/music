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
  // Android alerts hold three buttons; tapping outside cancels.
  Alert.alert(
    title,
    undefined,
    actions.slice(0, 3).map((a) => ({ text: a.label, onPress: a.onPress, style: a.destructive ? 'destructive' : 'default' })),
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
