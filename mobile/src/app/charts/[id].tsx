import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { chartSummary } from '@music/chartView.js'
import ChartPlayer from '@/components/charts/ChartPlayer'
import Page from '@/components/Page'
import { HeaderButton, Hint, Notice } from '@/components/ui'
import { confirm, showActions, type Action } from '@/lib/actions'
import { useCharts } from '@/lib/charts'
import { colors, space, text } from '@/theme'

const REPORT_REASONS = ['Spam', 'Wrong chords', 'Offensive']

/** One chart with its backing band: transpose, tempo, style, mix, chord shapes and the sheet. */
export default function ChartScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { find, remove, report, status } = useCharts()
  const [notice, setNotice] = useState('')
  const chart = find(id)

  if (!chart) {
    return (
      <Page>
        <Stack.Screen options={{ title: 'Chart' }} />
        <Hint>{status === 'loading' ? 'Loading shared charts…' : 'This chart isn’t here any more.'}</Hint>
      </Page>
    )
  }

  const fail = (err: unknown) => setNotice(err instanceof Error ? err.message : String(err))
  const actions: Action[] = [
    ...(chart.mine ? [{ label: 'Edit', onPress: () => router.push({ pathname: '/charts/edit', params: { id: chart.id } }) }] : []),
    { label: chart.mine ? 'Duplicate' : 'Copy & edit', onPress: () => router.push({ pathname: '/charts/edit', params: { id: chart.id, copy: '1' } }) },
    ...(chart.mine
      ? [
          {
            label: 'Delete',
            destructive: true,
            onPress: () =>
              confirm(chart.source === 'shared' ? `Remove “${chart.title}” for everyone?` : `Delete “${chart.title}”?`, 'This can’t be undone.', 'Delete', () =>
                remove(chart)
                  .then(() => router.back())
                  .catch(fail),
              ),
          },
        ]
      : []),
    ...(chart.source === 'shared' && !chart.mine
      ? [
          {
            label: 'Report…',
            onPress: () =>
              showActions(
                `What’s wrong with “${chart.title}”?`,
                REPORT_REASONS.map((reason) => ({
                  label: reason,
                  onPress: () =>
                    report(chart, reason)
                      .then(() => setNotice('Thanks, the chart was reported.'))
                      .catch(fail),
                })),
              ),
          },
        ]
      : []),
  ]

  return (
    <Page>
      <Stack.Screen options={{ title: chart.title, headerRight: () => <HeaderButton ios="ellipsis.circle" android="more_vert" label="Chart actions" onPress={() => showActions(chart.title, actions)} /> }} />
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {chart.title}
        </Text>
        <Text style={styles.summary}>{chartSummary(chart)}</Text>
      </View>
      {notice ? <Notice>{notice}</Notice> : null}
      <ChartPlayer key={chart.id} chart={chart} />
    </Page>
  )
}

const styles = StyleSheet.create({
  head: { gap: space[1], paddingHorizontal: space[4] },
  title: { color: colors.text, fontSize: text.xl, fontWeight: '700' },
  summary: { color: colors.muted, fontSize: text.sm },
})
