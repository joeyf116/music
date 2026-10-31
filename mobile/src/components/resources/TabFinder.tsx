import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { tabSearchLinks } from '@music/resources.js'
import { colors, space, text } from '@/theme'
import { Field, Group, Icon, Section, TextButton } from '../ui'
import { openLink } from './ResourceRow'

/** Look a song up on the big tab sites, then add the best find to the catalog. */
export default function TabFinder({ onAdd }: { onAdd: () => void }) {
  const [song, setSong] = useState('')
  const found = tabSearchLinks(song)
  return (
    <Section title="Find tabs for a song">
      <View style={styles.pad}>
        <Field value={song} onChangeText={setSong} placeholder="Song or artist, e.g. Wonderwall" returnKeyType="search" accessibilityLabel="Song or artist" />
      </View>
      {found.length > 0 ? (
        <Group style={styles.card}>
          {found.map((l, i) => (
            <Pressable key={l.label} onPress={() => openLink(l.url)} accessibilityRole="link" style={({ pressed }) => [styles.row, i < found.length - 1 && styles.divider, pressed && styles.pressed]}>
              <View style={styles.flex}>
                <Text style={styles.label}>{l.label}</Text>
                <Text style={styles.note}>{l.note}</Text>
              </View>
              <Icon ios="arrow.up.right.square" android="open_in_new" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </Group>
      ) : null}
      <View style={styles.pad}>
        <TextButton title="Found a good one? Add it so everyone can find it" onPress={onAdd} />
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space[4] },
  card: { marginHorizontal: space[4], borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  pressed: { backgroundColor: colors.surface2 },
  flex: { flex: 1 },
  label: { color: colors.text, fontSize: text.base },
  note: { color: colors.muted, fontSize: text.xs },
})
