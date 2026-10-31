import { Stack, router, useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Icon } from '@/components/ui'
import { selection } from '@/lib/haptics'
import { PICKERS, isPickerId } from '@/lib/pickers'
import { usePref } from '@/lib/prefs'
import { colors, space, text, touch } from '@/theme'

/** A list sheet for one setting (see lib/pickers.ts): tap a row to choose it, and the sheet closes. */
export default function PickSheet() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const picker = PICKERS[isPickerId(id) ? id : 'scale']
  const [value, setValue] = usePref(picker.pref)
  const choose = (next: string) => {
    selection()
    setValue(next)
    router.back()
  }
  return (
    <>
      <Stack.Screen options={{ title: picker.title }} />
      <ScrollView contentContainerStyle={styles.list} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.heading} accessibilityRole="header">
          {picker.title}
        </Text>
        {picker.sections().map((section, s) => (
          <View key={s} style={styles.section}>
            {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
            <View style={styles.group}>
              {section.options.map((o, i) => {
                const on = o.value === value
                return (
                  <Pressable key={o.value} onPress={() => choose(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed]}>
                    <View style={styles.rowText}>
                      <Text style={[styles.label, on && styles.on]}>{o.label}</Text>
                      {'sub' in o && o.sub ? <Text style={styles.sub}>{o.sub}</Text> : null}
                    </View>
                    {on ? <Icon ios="checkmark" android="check" size={17} color={colors.accent} /> : null}
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  list: { padding: space[4], gap: space[4], paddingBottom: space[6] },
  heading: { color: colors.text, fontSize: text.xl, fontWeight: '700' },
  section: { gap: space[2] },
  sectionTitle: { color: colors.muted, fontSize: text.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: space[2] },
  group: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  row: { minHeight: touch + 4, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], paddingVertical: space[2], gap: space[3] },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pressed: { backgroundColor: colors.surface2 },
  rowText: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: text.base },
  on: { color: colors.accent, fontWeight: '600' },
  sub: { color: colors.muted, fontSize: text.sm },
})
