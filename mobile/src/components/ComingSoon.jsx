import { Linking, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, space, text } from '@/theme'
import { Button } from './ui'

const SITE = 'https://joeyf116.github.io/music/'

/** Placeholder for a page that hasn't been rebuilt natively yet: it opens the web version instead. */
export default function ComingSoon({ title, summary, hash }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.page, { paddingTop: insets.top + space[6] }]}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.summary}>{summary}</Text>
      <Text style={styles.note}>This page is coming to the app soon. Until then it works on the web.</Text>
      <Button title="Open on the web" onPress={() => Linking.openURL(`${SITE}#${hash}`)} style={styles.button} />
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space[4], gap: space[3] },
  title: { color: colors.text, fontSize: 34, fontWeight: '700' },
  summary: { color: colors.text, fontSize: text.lg, lineHeight: 24 },
  note: { color: colors.muted, fontSize: text.base, lineHeight: 22 },
  button: { alignSelf: 'flex-start', marginTop: space[2] },
})
