// The platform's own pop-up menu, anchored to whatever opens it: a SwiftUI Menu on iOS, a Material dropdown menu on
// Android (via @expo/ui). Used two ways (see docs/DESIGN.md, "Menus and selectors"):
// - as a pull-down of actions for one thing (⋯ on a chart, a link, a section), destructive items last and in red;
// - as a pop-up for picking one of a short list (ChoiceRow), with a checkmark on the current value.
import { MenuView, type MenuAction } from '@expo/ui/community/menu'
import { SymbolView } from 'expo-symbols'
import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { selection } from '@/lib/haptics'
import { colors } from '@/theme'

export interface MenuItem {
  label: string
  onPress?: () => void
  /** Red, and listed last. Anything that can't be undone still asks with `confirm` after this. */
  destructive?: boolean
  disabled?: boolean
  /** Shows a checkmark (the current value of a pop-up). */
  checked?: boolean
  /** A submenu (one level only), or an inline group when `inline` is set. */
  items?: MenuItem[]
  inline?: boolean
}

/** Menu items as native actions; each id is the item's path ("2", "3.1") so a press finds its handler. */
const toActions = (items: MenuItem[], path = ''): MenuAction[] =>
  items.map((item, i) => {
    const id = `${path}${i}`
    return {
      id,
      title: item.label,
      state: item.checked ? 'on' : undefined,
      attributes: item.destructive || item.disabled ? { destructive: item.destructive, disabled: item.disabled } : undefined,
      subactions: item.items ? toActions(item.items, `${id}.`) : undefined,
      displayInline: item.items ? item.inline : undefined,
    }
  })

const find = (items: MenuItem[], id: string): MenuItem | undefined =>
  id.split('.').reduce<MenuItem | undefined>((found, part, depth) => (depth === 0 ? items[Number(part)] : found?.items?.[Number(part)]), undefined)

interface MenuProps {
  items: MenuItem[]
  /** Shown above the items on iOS (Android menus have no title). Only when it adds meaning. */
  title?: string
  /** What opens the menu. Not a button itself: the menu handles the tap. */
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

export function Menu({ items, title, children, style }: MenuProps) {
  return (
    <MenuView
      title={title}
      actions={toActions(items)}
      colorScheme="dark"
      style={style}
      onPressAction={(e) => {
        const item = find(items, e.nativeEvent.event)
        if (!item?.onPress) return
        selection()
        item.onPress()
      }}
    >
      {children}
    </MenuView>
  )
}

/** The ⋯ button that opens a pull-down of actions (navigation bar, a list row, a section heading). */
export function MoreMenu({ label, items, title }: { label: string; items: MenuItem[]; title?: string }) {
  return (
    <Menu items={items} title={title}>
      <View style={styles.more} accessible accessibilityRole="button" accessibilityLabel={label}>
        <SymbolView name={{ ios: 'ellipsis.circle', android: 'more_vert' }} size={22} tintColor={colors.accent} />
      </View>
    </Menu>
  )
}

const styles = StyleSheet.create({
  more: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
})
