import { openBrowserAsync } from 'expo-web-browser'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { isNew, type Resource } from '@music/resources.js'
import { colors, space, text } from '@/theme'
import { Badge, HeaderButton } from '../ui'

export const openLink = (url: string) => openBrowserAsync(url, { controlsColor: colors.accent, toolbarColor: colors.bg })

interface ResourceRowProps {
  resource: Resource
  starred: boolean
  onStar: () => void
  activeTags: string[]
  onTag: (tag: string) => void
  /** Remove / report, when there's anything to offer. */
  onMore?: () => void
}

/** One catalog entry: tapping it opens the page in the in-app browser (Safari / Custom Tabs). */
export default function ResourceRow({ resource: r, starred, onStar, activeTags, onTag, onMore }: ResourceRowProps) {
  return (
    <View style={styles.row}>
      <Pressable onPress={() => openLink(r.url)} accessibilityRole="link" accessibilityLabel={`${r.title}, ${r.type}${r.host ? `, ${r.host}` : ''}`} accessibilityHint={r.description || undefined} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={styles.badges}>
          <Badge label={r.type} />
          {r.level ? <Badge label={r.level} /> : null}
          {isNew(r) ? <Badge label="New" tone="good" /> : null}
          {r.source === 'local' ? <Badge label="Only me" tone="accent" /> : null}
        </View>
        <Text style={styles.title}>{r.title}</Text>
        {r.host ? <Text style={styles.host}>{r.host}</Text> : null}
        {r.description ? <Text style={styles.desc}>{r.description}</Text> : null}
      </Pressable>
      {r.tags.length > 0 ? (
        <View style={styles.tags}>
          {r.tags.map((t) => {
            const on = activeTags.includes(t)
            return (
              <Pressable key={t} onPress={() => onTag(t)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Tag ${t}`} hitSlop={4} style={[styles.tag, on && styles.tagOn]}>
                <Text style={[styles.tagText, on && styles.tagTextOn]}>#{t}</Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
      <View style={styles.actions}>
        <HeaderButton ios={starred ? 'star.fill' : 'star'} android={starred ? 'star' : 'star_border'} label={`${starred ? 'Unstar' : 'Star'} ${r.title}`} onPress={onStar} />
        {onMore ? <HeaderButton ios="ellipsis" android="more_horiz" label={`More for ${r.title}`} onPress={onMore} /> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: space[4], paddingVertical: space[3], gap: space[2], backgroundColor: colors.bg },
  main: { gap: 4, paddingRight: 88 },
  pressed: { opacity: 0.6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
  title: { color: colors.text, fontSize: text.base, fontWeight: '600' },
  host: { color: colors.muted, fontSize: text.xs },
  desc: { color: colors.text, fontSize: text.sm, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
  tag: { paddingHorizontal: space[2], paddingVertical: 4, borderRadius: 8, backgroundColor: colors.surface },
  tagOn: { backgroundColor: colors.accentSoft },
  tagText: { color: colors.muted, fontSize: text.xs },
  tagTextOn: { color: colors.accent },
  actions: { position: 'absolute', top: space[2], right: space[2], flexDirection: 'row', gap: space[1] },
})
