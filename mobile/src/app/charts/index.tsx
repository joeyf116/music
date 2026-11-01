import { Stack, router } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { STYLES, STYLE_IDS } from '@music/arranger.js'
import { ALL_SHELF, barCount, chartCountText, chartShelves, filterCharts, keyLabel, type CatalogChart } from '@music/chartView.js'
import { CHARTS_SHEET } from '@/components/charts/ChartPlayer'
import { Badge, ChipRow, ChoiceRow, Group, HeaderButton, Hint, Icon, Notice } from '@/components/ui'
import { useCharts } from '@/lib/charts'
import { useStored } from '@/lib/prefs'
import { colors, space, text } from '@/theme'

const STYLE_SECTIONS = [{ options: [{ value: '', label: 'All styles' }, ...STYLE_IDS.map((id) => ({ value: id, label: STYLES[id].name }))] }]

function ChartRow({ chart }: { chart: CatalogChart }) {
  const meta = [keyLabel(chart.key), STYLES[chart.style]?.name, chart.time, `${barCount(chart)} bars`].filter(Boolean).join(' · ')
  return (
    <Pressable
      onPress={() => router.push(`/charts/${encodeURIComponent(chart.id)}`)}
      accessibilityRole="button"
      accessibilityLabel={`${chart.title}${chart.composer ? `, ${chart.composer}` : ''}. ${meta}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.title} numberOfLines={1}>
          {chart.title}
        </Text>
        {chart.composer ? (
          <Text style={styles.composer} numberOfLines={1}>
            {chart.composer}
          </Text>
        ) : null}
        <View style={styles.tags}>
          <Text style={styles.meta}>{meta}</Text>
          {chart.source === 'shared' ? <Badge label="shared" /> : null}
          {chart.mine ? <Badge label={chart.source === 'local' ? 'only you' : 'yours'} tone="accent" /> : null}
        </View>
      </View>
      <Icon ios="chevron.right" android="chevron_right" size={14} color={colors.muted} />
    </Pressable>
  )
}

/** The chart catalog, as on the web (src/components/Charts.jsx): search, shelves, a style filter and every chart. */
export default function ChartsScreen() {
  const { all, shared, local, mine, status } = useCharts()
  const [collection, setCollection] = useStored('music.chartCollection', ALL_SHELF)
  const [style, setStyle] = useState('')
  const [query, setQuery] = useState('')
  const shelves = chartShelves(shared, local, mine)
  const shelf = shelves.includes(collection) ? collection : ALL_SHELF
  const visible = filterCharts(all, { collection: shelf, style, query })

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderButton ios="plus" android="add" label="New chart" onPress={() => router.push('/charts/edit')} />,
          headerSearchBarOptions: { placeholder: 'Title, composer or key', onChangeText: (e) => setQuery(e.nativeEvent.text), hideWhenScrolling: false, autoCapitalize: 'none' },
        }}
      />
      <FlatList
        data={visible}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ChartRow chart={item} />}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.head}>
            <Text style={styles.summary}>Pick a song and play along with a drums, bass and piano band in any key and tempo.</Text>
            <ChipRow label="Shelf" options={shelves.map((s) => ({ value: s, label: s }))} value={shelf} onChange={setCollection} />
            <Group>
              <ChoiceRow label="Style" value={style} sections={STYLE_SECTIONS} onChange={setStyle} sheet={CHARTS_SHEET} first last />
            </Group>
            {status === 'error' ? <Notice tone="bad">Shared charts couldn’t be loaded right now, so only built-in charts and your own are shown.</Notice> : null}
            <Text style={styles.count} accessibilityLiveRegion="polite">
              {chartCountText(visible.length, all.length)}
            </Text>
          </View>
        }
        ListEmptyComponent={<Hint>No charts match. Try another search, or tap + to write one.</Hint>}
      />
    </>
  )
}

const styles = StyleSheet.create({
  list: { paddingBottom: space[6] },
  head: { gap: space[3], paddingTop: space[2], paddingBottom: space[2] },
  summary: { color: colors.muted, fontSize: text.base, lineHeight: 22, paddingHorizontal: space[4] },
  count: { color: colors.muted, fontSize: text.sm, paddingHorizontal: space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3], backgroundColor: colors.bg },
  pressed: { backgroundColor: colors.surface },
  rowText: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: text.base, fontWeight: '600' },
  composer: { color: colors.muted, fontSize: text.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2], marginTop: 2 },
  meta: { color: colors.muted, fontSize: text.xs },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: space[4] },
})
