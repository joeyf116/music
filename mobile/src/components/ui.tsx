// Small building blocks shared by every screen, styled like the system's own controls.
import SegmentedControlBase, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control'
import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import { useEffect, useRef, type ComponentType, type ReactNode } from 'react'
import { Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Switch, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { impact, selection } from '@/lib/haptics'
import { colors, space, text, touch } from '@/theme'

// The package's class typings predate React 19's JSX types; its props are what matter here.
const SegmentedControl = SegmentedControlBase as unknown as ComponentType<SegmentedControlProps>

type IosSymbol = Extract<SymbolViewProps['name'], { ios?: unknown }>['ios']
type AndroidSymbol = Extract<SymbolViewProps['name'], { android?: unknown }>['android']

export interface Choice<V> {
  value: V
  label: string
}

interface SectionProps {
  title?: string
  sub?: string
  right?: ReactNode
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/** A titled group on a screen (like a section in iOS Settings). `right` sits beside the title. */
export function Section({ title, sub, right, children, style }: SectionProps) {
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

interface SegmentedProps<V extends string> {
  options: readonly Choice<V>[]
  value: V
  onChange: (value: V) => void
  style?: StyleProp<ViewStyle>
}

/** One of a few options, as the platform's segmented control (UISegmentedControl on iOS). */
export function Segmented<V extends string>({ options, value, onChange, style }: SegmentedProps<V>) {
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

export interface Chip<V> {
  value: V
  label: string
  /** Small text above the label (a chord's numeral). */
  top?: string
  /** Small text under the label (a fret range, an interval). */
  sub?: string
  /** Marks the chip as selected when the row has no single value (chips that light up during playback). */
  on?: boolean
  /** A quieter highlight (the key's tonic chord, the root note). */
  tonic?: boolean
  a11y?: string
}

interface ChipRowProps<V, C extends Chip<V>> {
  options: readonly C[]
  value?: V | null
  onChange: (value: V, chip: C) => void
  label: string
  /** Lay the chips out in rows instead of one sideways-scrolling line (the twelve keys fit two rows on a phone). */
  wrap?: boolean
  style?: StyleProp<ViewStyle>
}

/** Pill buttons in a row that scrolls sideways (positions, chords), keeping the selected one in view. */
export function ChipRow<V, C extends Chip<V>>({ options, value, onChange, label, wrap = false, style }: ChipRowProps<V, C>) {
  const scroller = useRef<ScrollViewInstance>(null)
  const offsets = useRef<number[]>([])
  const selectedIndex = options.findIndex((o) => o.value === value || o.on)
  const reveal = (x: number | undefined, animated: boolean) => {
    if (!wrap && x !== undefined) scroller.current?.scrollTo({ x: Math.max(0, x - space[6]), animated })
  }
  useEffect(() => reveal(offsets.current[selectedIndex], true))

  const chips = options.map((o, i) => {
    const on = o.value === value || Boolean(o.on)
    return (
      <Pressable
        key={String(o.value)}
        onLayout={(e) => {
          offsets.current[i] = e.nativeEvent.layout.x
          if (i === selectedIndex) reveal(e.nativeEvent.layout.x, false)
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
        {o.sub ? <Text style={[styles.chipSub, on && styles.chipTextOn]}>{o.sub}</Text> : null}
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

interface RowProps {
  label: string
  first?: boolean
  last?: boolean
}

/** A row that opens something (a picker sheet), showing the current value and a chevron. */
export function PickerRow({ label, value, onPress, first, last }: RowProps & { value: string; onPress: () => void }) {
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
export function SwitchRow({ label, value, onChange, disabled, first, last }: RowProps & { value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <View style={[styles.row, first && styles.rowFirst, last && styles.rowLast, !last && styles.rowDivider]}>
      <Text style={[styles.rowLabel, disabled && styles.disabled]}>{label}</Text>
      <PlatformSwitch value={value} onChange={onChange} disabled={disabled} label={label} />
    </View>
  )
}

/** The platform switch in the app's colours, with a selection tap. */
export function PlatformSwitch({ value, onChange, disabled, label }: { value: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <Switch
      value={value}
      disabled={disabled}
      accessibilityLabel={label}
      onValueChange={(v) => {
        selection()
        onChange(v)
      }}
      trackColor={{ true: colors.accent, false: colors.surface2 }}
      thumbColor={Platform.OS === 'android' ? (value ? colors.onAccent : colors.muted) : undefined}
      ios_backgroundColor={colors.surface2}
    />
  )
}

interface ButtonProps {
  title: string
  onPress: () => void
  /** The one filled accent button on a screen. */
  primary?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button({ title, onPress, primary = false, disabled = false, style }: ButtonProps) {
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
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{title}</Text>
    </Pressable>
  )
}

interface StepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
}

/** A number with − / + either side (tempo). VoiceOver and TalkBack can swipe it up and down. */
export function Stepper({ label, value, onChange, min, max, step = 1 }: StepperProps) {
  const n = Number(value) || min
  const bump = (d: number) => {
    selection()
    onChange(Math.max(min, Math.min(max, n + d)))
  }
  return (
    <View
      style={styles.stepper}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ now: n, min, max }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => bump(e.nativeEvent.actionName === 'increment' ? step : -step)}
    >
      <Pressable onPress={() => bump(-step)} disabled={n <= min} style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
        <Text style={styles.stepSign}>−</Text>
      </Pressable>
      <View style={styles.stepValue}>
        <Text style={styles.stepNumber}>{n}</Text>
        <Text style={styles.stepLabel}>{label}</Text>
      </View>
      <Pressable onPress={() => bump(step)} disabled={n >= max} style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
        <Text style={styles.stepSign}>+</Text>
      </Pressable>
    </View>
  )
}

/** A text field styled for the dark theme. */
export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} keyboardAppearance="dark" style={styles.input} {...props} />
}

interface IconProps {
  ios: IosSymbol
  android: AndroidSymbol
  size?: number
  color?: string
}

/** SF Symbol on iOS, Material Symbol on Android. */
export function Icon({ ios, android, size = 20, color = colors.text }: IconProps) {
  return <SymbolView name={{ ios, android }} size={size} tintColor={color} />
}

/** An icon button for the navigation bar. */
export function HeaderButton({ ios, android, label, onPress }: Pick<IconProps, 'ios' | 'android'> & { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
      <Icon ios={ios} android={android} size={22} color={colors.accent} />
    </Pressable>
  )
}

export function Hint({ children }: { children: ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>
}

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
