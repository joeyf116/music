// Small building blocks shared by every screen, styled like the system's own controls.
import SegmentedControlBase, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control'
import Slider from '@react-native-community/slider'
import type { Href } from 'expo-router'
import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Switch, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { choose, type ChoiceValue, type ChooseSection } from '@/lib/choose'
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

interface ChoiceRowProps<V extends ChoiceValue> extends RowProps {
  value: V
  /** The list, as sections (or one section of options). */
  sections: ChooseSection<V>[]
  onChange: (value: V) => void
  /** The tab stack's choose sheet, e.g. '/rhythm/choose'. */
  sheet: Href
  /** Title of the sheet; the row label by default. */
  title?: string
  disabled?: boolean
}

/** A setting picked from a list: shows the current choice and opens the list as a sheet. */
export function ChoiceRow<V extends ChoiceValue>({ label, value, sections, onChange, sheet, title, disabled, first, last }: ChoiceRowProps<V>) {
  const current = sections.flatMap((s) => s.options).find((o) => o.value === value)
  return (
    <Pressable
      disabled={disabled}
      onPress={() => choose(sheet, { title: title ?? label, sections, value, onChoose: onChange })}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${current?.label ?? ''}`}
      style={({ pressed }) => [styles.row, first && styles.rowFirst, last && styles.rowLast, !last && styles.rowDivider, pressed && styles.rowPressed, disabled && styles.disabled]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {current?.label ?? ''}
      </Text>
      <Icon ios="chevron.up.chevron.down" android="unfold_more" size={14} color={colors.muted} />
    </Pressable>
  )
}

interface SliderRowProps extends RowProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  disabled?: boolean
  /** How the value reads next to the label (e.g. a percentage). */
  format?: (value: number) => string
}

/** A value on a native slider, with its reading beside the label. */
export function SliderRow({ label, value, onChange, min, max, step = 1, disabled, format = String, first, last }: SliderRowProps) {
  return (
    <View style={[styles.row, styles.sliderRow, first && styles.rowFirst, last && styles.rowLast, !last && styles.rowDivider, disabled && styles.disabled]}>
      <View style={styles.sliderHead}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{format(value)}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        disabled={disabled}
        onValueChange={onChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.surface2}
        thumbTintColor={Platform.OS === 'android' ? colors.accent : undefined}
        accessibilityLabel={label}
        style={styles.slider}
      />
    </View>
  )
}

/** A tempo slider on its own (under a big tempo readout). */
export function TempoSlider({ value, onChange, min = 30, max = 300, label = 'Tempo' }: { value: number; onChange: (value: number) => void; min?: number; max?: number; label?: string }) {
  return (
    <Slider
      value={value}
      minimumValue={min}
      maximumValue={max}
      step={1}
      onValueChange={onChange}
      minimumTrackTintColor={colors.accent}
      maximumTrackTintColor={colors.surface2}
      thumbTintColor={Platform.OS === 'android' ? colors.accent : undefined}
      accessibilityLabel={label}
      style={styles.tempoSlider}
    />
  )
}

/** Rows grouped on one rounded card, like a section of iOS Settings. */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.group, style]}>{children}</View>
}

interface DisclosureProps {
  title: string
  /** What's inside, in a few words, shown while closed. */
  summary?: string
  initiallyOpen?: boolean
  open?: boolean
  onToggle?: (open: boolean) => void
  children: ReactNode
}

/** A section that folds away (advanced options, help), with its summary showing while closed. */
export function Disclosure({ title, summary, initiallyOpen = false, open: controlled, onToggle, children }: DisclosureProps) {
  const [own, setOwn] = useState(initiallyOpen)
  const open = controlled ?? own
  const toggle = () => {
    selection()
    setOwn(!open)
    onToggle?.(!open)
  }
  return (
    <View style={styles.disclosure}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={({ pressed }) => [styles.disclosureHead, pressed && styles.rowPressed]}>
        <Icon ios={open ? 'chevron.down' : 'chevron.right'} android={open ? 'expand_more' : 'chevron_right'} size={14} color={colors.muted} />
        <Text style={styles.disclosureTitle}>{title}</Text>
        {summary && !open ? (
          <Text style={styles.disclosureSummary} numberOfLines={1}>
            {summary}
          </Text>
        ) : null}
      </Pressable>
      {open ? <View style={styles.disclosureBody}>{children}</View> : null}
    </View>
  )
}

/** A plain text button in the accent colour (secondary actions like "Clear taps"). */
export function TextButton({ title, onPress, disabled, danger }: { title: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button" style={({ pressed }) => [styles.textButton, (pressed || disabled) && styles.pressed]}>
      <Text style={[styles.textButtonText, danger && styles.danger]}>{title}</Text>
    </Pressable>
  )
}

/** A small rounded label (a resource's type, "yours", "new"). */
export function Badge({ label, tone = 'plain' }: { label: string; tone?: 'plain' | 'accent' | 'good' }) {
  return (
    <View style={[styles.badge, tone === 'accent' && styles.badgeAccent, tone === 'good' && styles.badgeGood]}>
      <Text style={[styles.badgeText, tone === 'accent' && styles.badgeTextAccent]}>{label}</Text>
    </View>
  )
}

/** A short status or result line under a control. */
export function Notice({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'good' | 'bad' }) {
  return (
    <Text style={[styles.notice, tone === 'good' && styles.good, tone === 'bad' && styles.danger]} accessibilityLiveRegion="polite">
      {children}
    </Text>
  )
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
  sliderRow: { flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: space[2] },
  sliderHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  slider: { height: 36 },
  tempoSlider: { marginHorizontal: space[4], height: 40 },
  group: { gap: 0 },
  disclosure: { marginHorizontal: space[4], backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  disclosureHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: touch, paddingHorizontal: space[4] },
  disclosureTitle: { color: colors.text, fontSize: text.base, fontWeight: '600' },
  disclosureSummary: { color: colors.muted, fontSize: text.sm, flex: 1 },
  disclosureBody: { paddingBottom: space[4], gap: space[3] },
  textButton: { paddingVertical: space[1] },
  textButtonText: { color: colors.accent, fontSize: text.base, fontWeight: '600' },
  danger: { color: colors.danger },
  good: { color: colors.good },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.surface2 },
  badgeAccent: { backgroundColor: colors.accentSoft },
  badgeGood: { backgroundColor: 'rgba(48, 164, 108, 0.2)' },
  badgeText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  badgeTextAccent: { color: colors.accent },
  notice: { color: colors.muted, fontSize: text.base, lineHeight: 22, paddingHorizontal: space[4] },
})
