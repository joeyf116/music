import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ChoiceRow, Group, SwitchRow } from '@/components/ui'
import { oneSection } from '@/lib/choose'
import { LABEL_OPTIONS } from '@music/fretboardView.js'
import { useMusic } from '@/lib/music'
import { tuningSections } from '@/lib/pickers'
import { usePref } from '@/lib/prefs'
import { colors, space, text } from '@/theme'

/** Neck settings: set once and mostly left alone, so they live in a sheet instead of on the page. */
export default function NeckSettings() {
  const { tuningId, setTuningId } = useMusic()
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
        <Group>
          <ChoiceRow label="Tuning" value={tuningId} sections={tuningSections()} onChange={setTuningId} sheet="/choose" first />
          <ChoiceRow label="Note labels" value={labels} sections={oneSection([...LABEL_OPTIONS])} onChange={setLabels} sheet="/choose" />
          <SwitchRow label="Show every note in the key" value={showAll} onChange={setShowAll} disabled={allPositions} last />
        </Group>
        {allPositions ? <Text style={styles.note}>The whole-neck view always shows every note.</Text> : null}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { paddingVertical: space[4], gap: space[5] },
  heading: { color: colors.text, fontSize: text.xl, fontWeight: '700', paddingHorizontal: space[4] },
  group: { gap: space[2] },
  note: { color: colors.muted, fontSize: text.sm, paddingHorizontal: space[4] + space[2] },
})
