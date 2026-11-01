import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { STYLES, STYLE_IDS } from '@music/arranger.js'
import { ALL_KEYS, CHART_LIMITS, TIME_SIGNATURES, badTokens, blankChart, validateChart, type Chart, type ChartSection } from '@music/chart.js'
import { CHART_HELP, editableChart, moveSection, nextSection, spreadBars } from '@music/chartView.js'
import ChartPlayer, { CHARTS_SHEET } from '@/components/charts/ChartPlayer'
import { MoreMenu, type MenuItem } from '@/components/Menu'
import Page from '@/components/Page'
import { Button, ChoiceRow, Disclosure, Field, Group, Hint, Notice, Section, Segmented, Stepper, SwitchRow, TextButton } from '@/components/ui'
import { useCharts } from '@/lib/charts'
import { CAN_SHARE } from '@/lib/sharing'
import { colors, mono, space, text } from '@/theme'

const STYLE_SECTIONS = [{ options: STYLE_IDS.map((id) => ({ value: id, label: STYLES[id].name })) }]
const KEY_SECTIONS = [
  { title: 'Major', options: ALL_KEYS.filter((k) => !k.endsWith('m')).map((k) => ({ value: k, label: `${k} major` })) },
  { title: 'Minor', options: ALL_KEYS.filter((k) => k.endsWith('m')).map((k) => ({ value: k, label: `${k.slice(0, -1)} minor` })) },
]
const TIME_OPTIONS = TIME_SIGNATURES.map((t) => ({ value: t, label: t }))

/** Writing a chart: details, then sections of bar boxes, with the band underneath to try it out. Opens as a modal. */
export default function ChartEditorScreen() {
  const { id, copy } = useLocalSearchParams<{ id?: string; copy?: string }>()
  const { find, save, status } = useCharts()
  const source = find(id)
  const target = source && !copy ? source : null
  const [draft, setDraft] = useState<Chart>(() => (source ? { ...editableChart(source), title: copy && source.mine ? `${source.title} (copy)` : source.title } : blankChart()))
  const canShare = CAN_SHARE && status !== 'error'
  const sharedAlready = target?.source === 'shared'
  const [share, setShare] = useState(canShare && (sharedAlready || !target))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<Chart>) => setDraft((d) => ({ ...d, ...patch }))
  const setSections = (fn: (all: ChartSection[]) => ChartSection[]) => setDraft((d) => ({ ...d, sections: fn(d.sections) }))
  const setSection = (s: number, patch: Partial<ChartSection>) => setSections((all) => all.map((sec, i) => (i === s ? { ...sec, ...patch } : sec)))
  const setBars = (s: number, fn: (bars: string[]) => string[]) => setSections((all) => all.map((sec, i) => (i === s ? { ...sec, bars: fn(sec.bars) } : sec)))

  const totalBars = draft.sections.reduce((n, s) => n + s.bars.length, 0)
  const room = totalBars < CHART_LIMITS.totalBars
  const preview: Chart = { ...draft, tempo: Number(draft.tempo) || 120, sections: draft.sections.filter((s) => s.bars.length) }

  const submit = async () => {
    const result = validateChart(draft, STYLES)
    if (result.error !== undefined) return setError(result.error)
    setError('')
    setSaving(true)
    try {
      const saved = await save(result.chart, target, share)
      router.dismiss()
      router.navigate(`/charts/${encodeURIComponent(saved)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  const sectionActions = (s: number): MenuItem[] => [
      ...(s > 0 ? [{ label: 'Move up', onPress: () => setSections((all) => moveSection(all, s, -1)) }] : []),
      ...(s < draft.sections.length - 1 ? [{ label: 'Move down', onPress: () => setSections((all) => moveSection(all, s, 1)) }] : []),
      ...(draft.sections.length < CHART_LIMITS.sections ? [{ label: 'Duplicate', onPress: () => setSections((all) => [...all.slice(0, s + 1), { ...all[s], bars: [...all[s].bars] }, ...all.slice(s + 1)]) }] : []),
      ...(draft.sections.length > 1 ? [{ label: 'Delete', destructive: true, onPress: () => setSections((all) => all.filter((_, i) => i !== s)) }] : []),
  ]

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: target ? 'Edit chart' : 'New chart',
          headerLeft: () => <TextButton title="Cancel" onPress={() => router.back()} />,
          headerRight: () => <TextButton title={saving ? 'Saving…' : 'Save'} onPress={submit} disabled={saving} />,
        }}
      />
      <Page summary="Type the chords bar by bar and hear the band play them as you go.">
        <View style={styles.fields}>
          <Field value={draft.title} maxLength={CHART_LIMITS.title} onChangeText={(title) => set({ title })} placeholder="Title (e.g. Blues for practice)" accessibilityLabel="Title" />
          <Field value={draft.composer} maxLength={CHART_LIMITS.composer} onChangeText={(composer) => set({ composer })} placeholder="Composer (optional)" accessibilityLabel="Composer" />
        </View>
        <Group>
          <ChoiceRow label="Style" value={draft.style} sections={STYLE_SECTIONS} onChange={(style) => set({ style, tempo: STYLES[style].tempo })} sheet={CHARTS_SHEET} first />
          <ChoiceRow label="Key" value={draft.key} sections={KEY_SECTIONS} onChange={(key) => set({ key })} sheet={CHARTS_SHEET} last />
        </Group>
        <Segmented options={TIME_OPTIONS} value={draft.time} onChange={(time) => set({ time })} />
        <View style={styles.tempo}>
          <Stepper label="BPM" value={Number(draft.tempo) || 120} onChange={(tempo) => set({ tempo })} min={40} max={300} step={5} />
        </View>

        <Disclosure title="How to write bars">
          {CHART_HELP.map((line) => (
            <Text key={line} style={styles.help}>
              • {line}
            </Text>
          ))}
        </Disclosure>

        {draft.sections.map((section, s) => (
          <Section key={s} title={`Section ${section.label || s + 1}`} sub={`${section.bars.length} bars`} right={<MoreMenu label={`Section ${s + 1} actions`} items={sectionActions(s)} />}>
            <View style={styles.fields}>
              <Field value={section.label} maxLength={CHART_LIMITS.label} onChangeText={(label) => setSection(s, { label })} placeholder="Section name (A, Verse…)" accessibilityLabel={`Section ${s + 1} name`} />
            </View>
            <View style={styles.bars}>
              {section.bars.map((bar, b) => {
                const bad = badTokens(bar)
                return (
                  <TextInput
                    key={b}
                    value={bar}
                    maxLength={200}
                    onChangeText={(value) => setBars(s, (bars) => spreadBars(bars, b, value))}
                    accessibilityLabel={`${section.label || `Section ${s + 1}`} bar ${b + 1}${bad.length ? `, can't read ${bad.join(', ')}` : ''}`}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    keyboardAppearance="dark"
                    placeholder={String(b + 1)}
                    placeholderTextColor={colors.border}
                    style={[styles.bar, bad.length > 0 && styles.barBad]}
                  />
                )
              })}
            </View>
            <View style={styles.barActions}>
              <TextButton title="+ Bar" onPress={() => setBars(s, (bars) => [...bars, ''])} disabled={section.bars.length >= CHART_LIMITS.barsPerSection || !room} />
              <TextButton title="+ 4 bars" onPress={() => setBars(s, (bars) => [...bars, '', '', '', ''].slice(0, CHART_LIMITS.barsPerSection))} disabled={section.bars.length >= CHART_LIMITS.barsPerSection || !room} />
              <TextButton title="− Bar" onPress={() => setBars(s, (bars) => bars.slice(0, -1))} disabled={section.bars.length <= 1} />
            </View>
          </Section>
        ))}
        <View style={styles.fields}>
          <Button title="Add section" onPress={() => setSections((all) => [...all, nextSection(all)])} disabled={draft.sections.length >= CHART_LIMITS.sections} />
        </View>

        {canShare ? (
          <Group>
            <SwitchRow label={sharedAlready ? 'Shared in the public catalog' : 'Share so everyone can play it'} value={share} onChange={setShare} disabled={sharedAlready} first last />
          </Group>
        ) : null}
        {error ? <Notice tone="bad">{error}</Notice> : null}
        <View style={styles.fields}>
          <Button primary title={saving ? 'Saving…' : 'Save chart'} onPress={submit} disabled={saving} />
        </View>

        <Section title="Try it with the band">{preview.sections.length > 0 ? <ChartPlayer chart={preview} /> : <Hint>Add a bar to hear it.</Hint>}</Section>
      </Page>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fields: { gap: space[2], paddingHorizontal: space[4] },
  tempo: { paddingHorizontal: space[4], alignItems: 'flex-start' },
  help: { color: colors.text, fontSize: text.sm, lineHeight: 20, paddingHorizontal: space[4] },
  bars: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space[4], gap: space[1] },
  bar: { width: '23.5%', minHeight: 44, paddingHorizontal: space[2], borderRadius: 8, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, color: colors.text, fontFamily: mono, fontSize: text.sm },
  barBad: { borderColor: colors.danger },
  barActions: { flexDirection: 'row', gap: space[4], paddingHorizontal: space[4] },
})
