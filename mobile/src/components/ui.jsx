// Small building blocks shared by every screen, styled like the system's own controls.
import { useEffect, useRef } from 'react'
import SegmentedControl from '@react-native-segmented-control/segmented-control'
import { SymbolView } from 'expo-symbols'
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { impact, selection } from '@/lib/haptics'
import { colors, space, text, touch } from '@/theme'

/** A titled group on a screen (like a section in iOS Settings). `right` sits beside the title. */
export function Section({ title, sub, right, children, style }) {
  return (
    <View style={[styles.section, style]}>
      {(title || right) && (
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {title}
            {sub ? <Text style={styles.sectionSub}>{`  ${sub}`}</Text> : null}
          </Text>
          {right}
        </View>
      )}
      {children}
    </View>
  )
}

/** One of a few options, as the platform's segmented control (UISegmentedControl on iOS). */
export function Segmented({ options, value, onChange, style }) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  return (
    <SegmentedControl
      values={options.map((o) => o.label)}
      selectedIndex={index}
      onChange={(e) => {
        selection()
        onChange(options[e.nativeEvent.selectedSegmentIndex].value)
      }}
      appearance="dark"
      tintColor={Platform.OS === 'android' ? colors.accent : undefined}
      fontStyle={{ color: colors.text, fontSize: text.sm }}
      activeFontStyle={{ color: Platform.OS === 'android' ? colors.onAccent : colors.text, fontWeight: '600' }}
      style={[styles.segmented, style]}
    />
  )
}

/**
 * Pill buttons in a row that scrolls sideways (positions, chords), keeping the selected one in view.
 * `wrap` lays them out in rows instead (the twelve keys fit two rows on a phone).
 */
export function ChipRow({ options, value, onChange, renderSub, style, label, wrap }) {
  const scroller = useRef(null)
  const offsets = useRef({})
  const selectedIndex = options.findIndex((o) => o.value === value || o.on)
  useEffect(() => {
    const x = offsets.current[selectedIndex]
    if (!wrap && x !== undefined) scroller.current?.scrollTo({ x: Math.max(0, x - space[6]), animated: true })
  }, [selectedIndex, wrap])
  const chips = options.map((o, i) => {
        const on = o.value === value || o.on
        return (
          <Pressable
            key={String(o.value)}
            onLayout={(e) => {
              offsets.current[i] = e.nativeEvent.layout.x
              if (i === selectedIndex && !wrap) scroller.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - space[6]), animated: false })
            }}
            onPress={() => {
              selection()
              onChange(o.value, o)
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.a11y ?? o.label}
            style={({ pressed }) => [styles.chip, on && styles.chipOn, o.tonic && !on && styles.chipTonic, pressed && styles.pressed]}
          >
            {o.top ? <Text style={[styles.chipTop, on && styles.chipTextOn]}>{o.top}</Text> : null}
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
            {o.sub || renderSub ? <Text style={[styles.chipSub, on && styles.chipTextOn]}>{o.sub ?? renderSub?.(o)}</Text> : null}
          </Pressable>
        )
      })
  if (wrap)
    return (
      <View style={[styles.chipWrap, style]} accessibilityLabel={label}>
        {chips}
      </View>
    )
  return (
    <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, style]} accessibilityLabel={label}>
      {chips}
    </ScrollView>
  )
}

/** A row that opens something (a picker sheet), showing the current value and a chevron. */
export function PickerRow({ label, value, onPress, first, last }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={({ pressed }) => [styles.row, first && styles.rowFirst, last && styles.rowLast, !last && styles.rowDivider, pressed && styles.rowPressed]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
      <Icon ios="chevron.right" android="chevron_right" size={14} color={colors.muted} />
    </Pressable>
  )
}

/** An on/off setting as the platform switch. */
export function SwitchRow({ label, value, onChange, disabled, first, last }) {
  return (
    <View style={[styles.row, first && styles.rowFirst, last && styles.rowLast, !last && styles.rowDivider]}>
      <Text style={[styles.rowLabel, disabled && styles.disabled]}>{label}</Text>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          selection()
          onChange(v)
        }}
        trackColor={{ true: colors.accent, false: colors.surface2 }}
        thumbColor={Platform.OS === 'android' ? (value ? colors.onAccent : colors.muted) : undefined}
        ios_backgroundColor={colors.surface2}
      />
    </View>
  )
}

/** Buttons. `primary` is the one filled accent button on a screen. */
export function Button({ title, onPress, primary, disabled, icon, style }) {
  return (
    <Pressable
      onPress={() => {
        impact()
        onPress()
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, primary && styles.buttonPrimary, disabled && styles.disabled, pressed && styles.pressed, style]}
    >
      {icon}
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{title}</Text>
    </Pressable>
  )
}

/** A number with − / + either side (tempo). */
export function Stepper({ label, value, onChange, min, max, step = 1 }) {
  const n = Number(value) || min
  const bump = (d) => {
    selection()
    onChange(Math.max(min, Math.min(max, n + d)))
  }
  return (
    <View style={styles.stepper} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ now: n, min, max }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={(e) => bump(e.nativeEvent.actionName === 'increment' ? step : -step)}>
      <Pressable onPress={() => bump(-step)} disabled={n <= min} style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]} accessibilityLabel={`${label} down`}>
        <Text style={styles.stepSign}>−</Text>
      </Pressable>
      <View style={styles.stepValue}>
        <Text style={styles.stepNumber}>{n}</Text>
        <Text style={styles.stepLabel}>{label}</Text>
      </View>
      <Pressable onPress={() => bump(step)} disabled={n >= max} style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]} accessibilityLabel={`${label} up`}>
        <Text style={styles.stepSign}>+</Text>
      </Pressable>
    </View>
  )
}

/** A text field styled for the dark theme. */
export function Field(props) {
  return <TextInput placeholderTextColor={colors.muted} keyboardAppearance="dark" style={styles.input} {...props} />
}

/** SF Symbol on iOS, Material Symbol on Android. */
export function Icon({ ios, android, size = 20, color = colors.text }) {
  return <SymbolView name={{ ios, android }} size={size} tintColor={color} />
}

/** An icon button for the navigation bar. */
export function HeaderButton({ ios, android, label, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
      <Icon ios={ios} android={android} size={22} color={colors.accent} />
    </Pressable>
  )
}

export const Hint = ({ children }) => <Text style={styles.hint}>{children}</Text>

const styles = StyleSheet.create({
  section: { gap: space[2] },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], gap: space[3] },
  sectionTitle: { color: colors.text, fontSize: text.lg, fontWeight: '700', flexShrink: 1 },
  sectionSub: { color: colors.muted, fontSize: text.sm, fontWeight: '400' },
  segmented: { marginHorizontal: space[4], height: 36 },
  chipRow: { paddingHorizontal: space[4], gap: space[2] },
  chipWrap: { paddingHorizontal: space[4], gap: space[2], flexDirection: 'row', flexWrap: 'wrap' },
  chip: { minWidth: touch, minHeight: touch, paddingHorizontal: space[3], paddingVertical: 6, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTonic: { borderColor: colors.borderStrong },
  chipTop: { color: colors.muted, fontSize: text.xs, fontWeight: '600' },
  chipText: { color: colors.text, fontSize: text.base, fontWeight: '600' },
  chipSub: { color: colors.muted, fontSize: 11 },
  chipTextOn: { color: colors.onAccent },
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: touch + 4, paddingHorizontal: space[4], backgroundColor: colors.surface, marginHorizontal: space[4] },
  rowFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  rowLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowPressed: { backgroundColor: colors.surface2 },
  rowLabel: { color: colors.text, fontSize: text.base, flex: 1 },
  rowValue: { color: colors.muted, fontSize: text.base, maxWidth: '55%' },
  disabled: { opacity: 0.4 },
  button: { minHeight: touch, paddingHorizontal: space[4], borderRadius: 12, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonText: { color: colors.text, fontSize: text.base, fontWeight: '600' },
  buttonTextPrimary: { color: colors.onAccent, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  stepButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  stepSign: { color: colors.text, fontSize: 22, fontWeight: '500' },
  stepValue: { minWidth: 52, alignItems: 'center' },
  stepNumber: { color: colors.text, fontSize: text.lg, fontWeight: '700', fontVariant: ['tabular-nums'] },
  stepLabel: { color: colors.muted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  input: { minHeight: touch, marginHorizontal: space[4], paddingHorizontal: space[3], borderRadius: 12, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.borderStrong, color: colors.text, fontSize: text.base },
  headerButton: { padding: 4 },
  hint: { color: colors.muted, fontSize: text.sm, paddingHorizontal: space[4], lineHeight: 20 },
})
