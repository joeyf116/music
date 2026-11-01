import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { colors, space, text } from '@/theme'

/** A scrolling page under a large title, with the page's one-line summary on top. */
export default function Page({ summary, children }: { summary?: string; children: ReactNode }) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
      {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { paddingTop: space[2], paddingBottom: space[6], gap: space[5] },
  summary: { color: colors.muted, fontSize: text.base, lineHeight: 22, paddingHorizontal: space[4] },
})
