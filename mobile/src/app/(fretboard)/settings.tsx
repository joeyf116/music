import { router } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { PickerRow, Segmented, SwitchRow } from '@/components/ui'
import { LABEL_OPTIONS } from '@music/fretboardView.js'
import { useMusic } from '@/lib/music'
import { usePref } from '@/lib/prefs'
import { colors, space, text } from '@/theme'

/** Neck settings: set once and mostly left alone, so they live in a sheet instead of on the page. */
export default function NeckSettings() {
  const { tuningSpec } = useMusic()
  const [labels, setLabels] = usePref('music.labels')
  const [showAll, setShowAll] = usePref('music.showAll')
  const [position] = usePref('music.fretPosition')
  const [view] = usePref('music.mode')
  const allPositions = view === 'scale' && position === 'all'
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.heading} accessibilityRole="header">
        Neck settings
      </Text>
      <View style={styles.group}>
        <PickerRow label="Tuning" value={tuningSpec.name} onPress={() => router.push('/pick?id=tuning')} first last />
      </View>
      <View style={styles.group}>
        <Text style={styles.label}>Note labels</Text>
        <Segmented options={LABEL_OPTIONS} value={labels} onChange={setLabels} />
      </View>
      <View style={styles.group}>
        <SwitchRow label="Show every note in the key" value={showAll} onChange={setShowAll} disabled={allPositions} first last />
        {allPositions ? <Text style={styles.note}>The whole-neck view always shows every note.</Text> : null}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { paddingVertical: space[4], gap: space[5] },
  heading: { color: colors.text, fontSize: text.xl, fontWeight: '700', paddingHorizontal: space[4] },
  group: { gap: space[2] },
  label: { color: colors.muted, fontSize: text.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: space[4] + space[2] },
  note: { color: colors.muted, fontSize: text.sm, paddingHorizontal: space[4] + space[2] },
})
