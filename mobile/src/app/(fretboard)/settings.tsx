import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ChoiceRow, Group, SwitchRow } from '@/components/ui'
import { oneSection } from '@/lib/choose'
import { useMusic } from '@/lib/music'
import { chordTypeSections, tuningSections } from '@/lib/pickers'
import { usePref } from '@/lib/prefs'
import { colors, space, text } from '@/theme'
import { LABEL_OPTIONS, LAYOUT_OPTIONS, fretboardView } from '@music/fretboardView.js'
import { CHORD_STYLES } from '@music/practiceTab.js'
import { CHORDS } from '@music/theory.js'

/** Settings for the Fretboard tab: set once and mostly left alone, so they live in a sheet instead of on the page. */
export default function FretboardSettings() {
  const { tuningId, setTuningId, tuning, keyName, scaleType } = useMusic()
  const [labels, setLabels] = usePref('music.labels')
  const [showAll, setShowAll] = usePref('music.showAll')
  const [layout, setLayout] = usePref('music.scaleLayout')
  const [chordOverride, setChordOverride] = usePref('music.chordType')
  const [chordStyle, setChordStyle] = usePref('music.chordStyle')
  const [position] = usePref('music.fretPosition')
  const [view] = usePref('music.mode')
  const [chordDegree] = usePref('music.chordDegree')
  const [sevenths] = usePref('music.diatonicSevenths')
  const [voicingType] = usePref('music.voicingType')
  const model = fretboardView({ view, keyName, scaleType, chordDegree, chordOverride, sevenths, voicingType, voicingIndex: 0, layout, position, tuning, tuningId })
  const allPositions = model.view === 'scale' && position === 'all'
  // CAGED keeps to its pentatonic box, so the switch doesn't apply there.
  const caged = model.view === 'chord' && model.voicingType === 'caged'
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.heading} accessibilityRole="header">
        Settings
      </Text>
      <View style={styles.group}>
        <Group>
          <ChoiceRow label="Tuning" value={tuningId} sections={tuningSections()} onChange={setTuningId} sheet="/choose" first />
          <ChoiceRow label="Note labels" value={labels} sections={oneSection([...LABEL_OPTIONS])} onChange={setLabels} sheet="/choose" />
          <SwitchRow label="Show every note" value={showAll} onChange={setShowAll} disabled={allPositions || caged} last />
        </Group>
        {allPositions ? <Text style={styles.note}>The whole-neck view always shows every note.</Text> : null}
        {caged ? <Text style={styles.note}>CAGED shows each shape inside its pentatonic box.</Text> : null}
      </View>
      <View style={styles.group}>
        <Group>
          {model.view === 'scale' ? (
            <ChoiceRow label="Fingering" value={layout === 'across' ? 'across' : 'position'} sections={oneSection([...LAYOUT_OPTIONS])} onChange={setLayout} sheet="/choose" first />
          ) : (
            <ChoiceRow label="Chord type" value={model.overrideOk ? chordOverride : ''} sections={chordTypeSections(CHORDS[model.picked.type].name, false)} onChange={setChordOverride} sheet="/choose" first />
          )}
          <ChoiceRow label="Practice tab chords" value={chordStyle} sections={oneSection([...CHORD_STYLES])} onChange={setChordStyle} sheet="/choose" last />
        </Group>
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
