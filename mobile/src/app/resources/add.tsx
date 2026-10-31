import { Stack, router } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { LEVELS, RESOURCE_TYPES, normalizeTags, tagCounts } from '@music/resources.js'
import { LIMITS, validateSubmission } from '@music/sharedResources.js'
import Page from '@/components/Page'
import { Button, ChipRow, ChoiceRow, Field, Group, Hint, Notice, Segmented, TextButton } from '@/components/ui'
import { useResources } from '@/lib/resources'
import { CAN_SHARE } from '@/lib/sharing'
import { space } from '@/theme'

const EMPTY = { url: '', title: '', type: 'Tab', level: '', category: '', tags: '', description: '' }
const TYPE_SECTIONS = [{ options: RESOURCE_TYPES.map((t) => ({ value: t, label: t })) }]
const LEVEL_SECTIONS = [{ options: [{ value: '', label: 'Any level' }, ...LEVELS.map((l) => ({ value: l, label: l }))] }]
const WHO = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'me', label: 'Just me' },
] as const

/** Adding a link to the catalog, shared with everyone or kept on this device. Opens as a sheet. */
export default function AddResourceScreen() {
  const { all, add } = useResources()
  const [draft, setDraft] = useState(EMPTY)
  const [who, setWho] = useState<'everyone' | 'me'>(CAN_SHARE ? 'everyone' : 'me')
  const [status, setStatus] = useState({ busy: false, error: '' })
  const set = (patch: Partial<typeof EMPTY>) => setDraft((d) => ({ ...d, ...patch }))
  const tags = normalizeTags(draft.tags)
  const categories = useMemo(() => [...new Set(all.map((r) => r.category))].sort(), [all])
  const popular = useMemo(() => tagCounts(all).slice(0, 12), [all])

  const submit = async () => {
    const result = validateSubmission(draft)
    if (result.error !== undefined) return setStatus({ busy: false, error: result.error })
    setStatus({ busy: true, error: '' })
    try {
      await add(result.link, who === 'everyone')
      router.back()
    } catch (err) {
      setStatus({ busy: false, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <Page>
      <Stack.Screen options={{ headerLeft: () => <TextButton title="Cancel" onPress={() => router.back()} />, headerRight: () => <TextButton title={status.busy ? 'Adding…' : 'Add'} onPress={submit} disabled={status.busy} /> }} />
      <View style={styles.fields}>
        <Field value={draft.url} onChangeText={(url) => set({ url })} placeholder="Link (https://…)" keyboardType="url" autoCapitalize="none" autoCorrect={false} textContentType="URL" maxLength={LIMITS.url} accessibilityLabel="Link" />
        <Field value={draft.title} onChangeText={(title) => set({ title })} placeholder="Title (e.g. Blackbird – full tab)" maxLength={LIMITS.title} accessibilityLabel="Title" />
      </View>
      <Group>
        <ChoiceRow label="Type" value={draft.type} sections={TYPE_SECTIONS} onChange={(type) => set({ type })} sheet="/resources/choose" first />
        <ChoiceRow label="Level" value={draft.level} sections={LEVEL_SECTIONS} onChange={(level) => set({ level })} sheet="/resources/choose" last />
      </Group>
      <View style={styles.fields}>
        <Field value={draft.category} onChangeText={(category) => set({ category })} placeholder="Category (e.g. Songs)" maxLength={LIMITS.category} accessibilityLabel="Category" />
      </View>
      {categories.length > 0 ? <ChipRow label="Categories" options={categories.map((c) => ({ value: c, label: c }))} value={draft.category} onChange={(category: string) => set({ category })} /> : null}
      <View style={styles.fields}>
        <Field value={draft.tags} onChangeText={(t) => set({ tags: t })} placeholder="Tags, comma separated (e.g. fingerstyle, acoustic)" autoCapitalize="none" accessibilityLabel="Tags" />
      </View>
      {popular.length > 0 ? (
        <ChipRow
          label="Popular tags"
          options={popular.map(([t]) => ({ value: t, label: `#${t}`, on: tags.includes(t) }))}
          onChange={(t: string) => set({ tags: (tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]).join(', ') })}
        />
      ) : null}
      <View style={styles.fields}>
        <Field value={draft.description} onChangeText={(description) => set({ description })} placeholder="Note: what’s good about it? (optional)" maxLength={LIMITS.description} accessibilityLabel="Note" />
      </View>
      {CAN_SHARE ? <Segmented options={WHO} value={who} onChange={setWho} /> : <Hint>Shared links aren’t switched on in this build, so this is saved on this device only.</Hint>}
      {status.error ? <Notice tone="bad">{status.error}</Notice> : null}
      <View style={styles.fields}>
        <Button primary title={status.busy ? 'Adding…' : 'Add'} onPress={submit} disabled={status.busy} />
      </View>
    </Page>
  )
}

const styles = StyleSheet.create({
  fields: { gap: space[2], paddingHorizontal: space[4] },
})
