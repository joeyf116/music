import { Stack, router } from 'expo-router'
import { useMemo, useState } from 'react'
import { SectionList, StyleSheet, Text, View } from 'react-native'
import { LEVELS, SORTS, filterResources, sortResources, tagCounts, type Resource } from '@music/resources.js'
import ResourceRow from '@/components/resources/ResourceRow'
import TabFinder from '@/components/resources/TabFinder'
import { ChipRow, ChoiceRow, Disclosure, Group, HeaderButton, Hint, Notice, TextButton } from '@/components/ui'
import { confirm, showActions } from '@/lib/actions'
import { useStored } from '@/lib/prefs'
import { useResources } from '@/lib/resources'
import { colors, space, text } from '@/theme'

const SHEET = '/resources/choose'
const NO_FILTERS = { types: [] as string[], tags: [] as string[], level: '', category: 'All', starredOnly: false }
const LEVEL_SECTIONS = [{ options: [{ value: '', label: 'Any level' }, ...LEVELS.map((l) => ({ value: l, label: l }))] }]
const SORT_SECTIONS = [{ options: Object.entries(SORTS).map(([value, label]) => ({ value, label })) }]
const TAG_CLOUD_SIZE = 18
const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

/** The resource catalog, as on the web (src/components/Resources.jsx): search, type chips, more filters and the links. */
export default function ResourcesScreen() {
  const { all, status, starred, toggleStar, canRemove, canReport, remove, report } = useResources()
  const [sort, setSort] = useStored('music.resourceSort', 'category')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(NO_FILTERS)
  const [allTags, setAllTags] = useState(false)
  const [notice, setNotice] = useState('')
  const set = (patch: Partial<typeof NO_FILTERS>) => setFilters((f) => ({ ...f, ...patch }))
  const tagFilter = (t: string) => set({ tags: toggle(filters.tags, t) })

  const categories = useMemo(() => [...new Set(all.map((r) => r.category))].sort(), [all])
  const typeCounts = useMemo(() => Object.entries(all.reduce<Record<string, number>>((acc, r) => ((acc[r.type] = (acc[r.type] ?? 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]), [all])
  const tags = useMemo(() => tagCounts(all), [all])
  const visible = sortResources(filterResources(all, { ...filters, query, starred }), sort)
  const sections =
    sort === 'category'
      ? Object.entries(visible.reduce<Record<string, Resource[]>>((acc, r) => ((acc[r.category] ??= []).push(r), acc), {})).map(([title, data]) => ({ title, data }))
      : [{ title: '', data: visible }]
  const filtering = query !== '' || JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)
  const extraCount = (filters.level ? 1 : 0) + (filters.category !== 'All' ? 1 : 0) + filters.tags.length
  const cloud = allTags ? tags : [...tags.slice(0, TAG_CLOUD_SIZE), ...tags.slice(TAG_CLOUD_SIZE).filter(([t]) => filters.tags.includes(t))]
  const fail = (err: unknown) => setNotice(err instanceof Error ? err.message : String(err))

  const more = (r: Resource) =>
    showActions(r.title, [
      ...(canRemove(r)
        ? [
            {
              label: r.source === 'local' ? 'Remove' : 'Remove for everyone',
              destructive: true,
              onPress: () => (r.source === 'local' ? remove(r).catch(fail) : confirm(`Remove “${r.title}” for everyone?`, 'This can’t be undone.', 'Remove', () => remove(r).catch(fail))),
            },
          ]
        : []),
      ...(canReport(r)
        ? [
            {
              label: 'Report spam or a broken link',
              onPress: () =>
                report(r)
                  .then(() => setNotice('Thanks, the link was reported.'))
                  .catch(fail),
            },
          ]
        : []),
    ])

  const countText = `${visible.length === all.length ? `${all.length} resources` : `${visible.length} of ${all.length} resources`}${status === 'loading' ? ' · loading shared links…' : status === 'error' ? ' · shared links couldn’t be loaded right now' : ''}`

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderButton ios="plus" android="add" label="Add a resource" onPress={() => router.push('/resources/add')} />,
          headerSearchBarOptions: { placeholder: 'Titles, tags, sites, notes', onChangeText: (e) => setQuery(e.nativeEvent.text), hideWhenScrolling: false, autoCapitalize: 'none' },
        }}
      />
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={styles.sectionHead} accessibilityRole="header">
              {section.title} <Text style={styles.muted}>{section.data.length}</Text>
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ResourceRow resource={item} starred={starred.includes(item.url)} onStar={() => toggleStar(item)} activeTags={filters.tags} onTag={tagFilter} onMore={canRemove(item) || canReport(item) ? () => more(item) : undefined} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.head}>
            <Text style={styles.summary}>Lessons, tabs, videos and tools to practise with. Anyone can add one for everybody to see.</Text>
            <ChipRow
              label="Filter by type"
              options={[
                ...typeCounts.map(([type, count]) => ({ value: type, label: type, sub: String(count), on: filters.types.includes(type) })),
                { value: '★', label: '★ Starred', sub: String(all.filter((r) => starred.includes(r.url)).length), on: filters.starredOnly },
              ]}
              onChange={(v: string) => (v === '★' ? set({ starredOnly: !filters.starredOnly }) : set({ types: toggle(filters.types, v) }))}
            />
            <Disclosure title="More filters" summary={extraCount > 0 ? `${extraCount} on` : 'Level, category, tags, sort'}>
              <Group>
                <ChoiceRow label="Level" value={filters.level} sections={LEVEL_SECTIONS} onChange={(level) => set({ level })} sheet={SHEET} first />
                <ChoiceRow
                  label="Category"
                  value={categories.includes(filters.category) ? filters.category : 'All'}
                  sections={[{ options: [{ value: 'All', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))] }]}
                  onChange={(category) => set({ category })}
                  sheet={SHEET}
                />
                <ChoiceRow label="Sort" value={sort} sections={SORT_SECTIONS} onChange={setSort} sheet={SHEET} last />
              </Group>
              {tags.length > 0 ? (
                <>
                  <ChipRow label="Tags" options={cloud.map(([t, count]) => ({ value: t, label: `#${t}`, sub: String(count), on: filters.tags.includes(t) }))} onChange={tagFilter} wrap />
                  {tags.length > TAG_CLOUD_SIZE ? (
                    <View style={styles.pad}>
                      <TextButton title={allTags ? 'Fewer tags' : `All ${tags.length} tags`} onPress={() => setAllTags(!allTags)} />
                    </View>
                  ) : null}
                </>
              ) : null}
            </Disclosure>
            <View style={styles.countRow}>
              <Text style={styles.count} accessibilityLiveRegion="polite">
                {countText}
              </Text>
              {filtering && extraCount + filters.types.length > 0 ? <TextButton title="Clear filters" onPress={() => setFilters(NO_FILTERS)} /> : null}
            </View>
            {notice ? <Notice>{notice}</Notice> : null}
          </View>
        }
        ListEmptyComponent={<Hint>Nothing matches those filters yet. Clear them, or tap + to add one.</Hint>}
        ListFooterComponent={
          <View style={styles.footer}>
            <TabFinder onAdd={() => router.push('/resources/add')} />
          </View>
        }
      />
    </>
  )
}

const styles = StyleSheet.create({
  list: { paddingBottom: space[6] },
  head: { gap: space[3], paddingTop: space[2], paddingBottom: space[2] },
  summary: { color: colors.muted, fontSize: text.base, lineHeight: 22, paddingHorizontal: space[4] },
  pad: { paddingHorizontal: space[4] },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4] },
  count: { flex: 1, color: colors.muted, fontSize: text.sm },
  sectionHead: { color: colors.text, fontSize: text.lg, fontWeight: '700', paddingHorizontal: space[4], paddingVertical: space[2], backgroundColor: colors.bg },
  muted: { color: colors.muted, fontWeight: '400', fontSize: text.sm },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: space[4] },
  footer: { marginTop: space[5] },
})
