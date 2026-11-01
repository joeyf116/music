import { Stack, router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { selection } from '@/lib/haptics'
import { currentChoice } from '@/lib/choose'
import { colors, space, text, touch } from '@/theme'
import { Icon } from './ui'

/** The list sheet opened by `choose()` (lib/choose.ts): grouped rows with a check on the current value. */
export default function ChooseSheet() {
  // Read once: the request belongs to this presentation of the sheet.
  const [request] = useState(currentChoice)
  if (!request) {
    return (
      <View style={styles.list}>
        <Text style={styles.sub}>Nothing to choose.</Text>
      </View>
    )
  }
  const pick = (value: (typeof request)['value']) => {
    if (value === null) return
    selection()
    request.onChoose(value)
    router.back()
  }
  return (
    <>
      <Stack.Screen options={{ title: request.title }} />
      <ScrollView contentContainerStyle={styles.list} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.heading} accessibilityRole="header">
          {request.title}
        </Text>
        {request.sections.map((section, s) => (
          <View key={s} style={styles.section}>
            {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
            <View style={styles.group}>
              {section.options.map((o, i) => {
                const on = o.value === request.value
                return (
                  <Pressable
                    key={String(o.value)}
                    onPress={() => pick(o.value)}
                    disabled={o.disabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: o.disabled }}
                    style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed, o.disabled && styles.disabled]}
                  >
                    <View style={styles.rowText}>
                      <Text style={[styles.label, on && styles.on]}>{o.label}</Text>
                      {o.sub ? <Text style={styles.sub}>{o.sub}</Text> : null}
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
  disabled: { opacity: 0.4 },
  rowText: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: text.base },
  on: { color: colors.accent, fontWeight: '600' },
  sub: { color: colors.muted, fontSize: text.sm },
})
