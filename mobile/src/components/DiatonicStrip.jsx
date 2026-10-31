import { StyleSheet, Switch, Text, View } from 'react-native'
import { playChord } from '@music/audio.js'
import { SCALES, diatonicChords, sevenNoteScale } from '@music/theory.js'
import { selection } from '@/lib/haptics'
import { colors, space, text } from '@/theme'
import { ChipRow, Section } from './ui'

// Close voicing around C3–B3, so every chord in the strip sounds in the same register.
const chordPitches = (chord) => chord.intervals.map((i) => 48 + chord.rootPc + i)

/**
 * The chords of the current key and mode (I ii iii IV V vi vii° …) as a row of buttons. Tapping plays the chord,
 * or hands it to onPick (to show it on the neck or add it to a progression). `silent` leaves the playing to the page.
 */
export default function DiatonicStrip({ keyName, scaleId, sevenths, onSeventhsChange, onPick, highlight, silent, title, hint }) {
  const modeId = sevenNoteScale(scaleId)
  const chords = diatonicChords(keyName, modeId, sevenths)
  const pick = (chord) => {
    if (!silent) playChord(chordPitches(chord))
    onPick?.(chord)
  }
  return (
    <Section
      title={title ?? `Chords in ${chords[0].rootName} ${SCALES[modeId].name}`}
      right={
        <View style={styles.sevenths}>
          <Text style={styles.label}>7ths</Text>
          <Switch
            value={sevenths}
            onValueChange={(v) => {
              selection()
              onSeventhsChange(v)
            }}
            trackColor={{ true: colors.accent, false: colors.surface2 }}
            ios_backgroundColor={colors.surface2}
            accessibilityLabel="Show 7th chords"
          />
        </View>
      }
    >
      <ChipRow
        label="Chords in this key"
        options={chords.map((c) => ({ value: c.degree, top: c.numeral, label: c.name, on: highlight?.(c), tonic: c.degree === 0, a11y: `${c.numeral}: ${c.name}`, chord: c }))}
        value={null}
        onChange={(_, o) => pick(o.chord)}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Section>
  )
}

const styles = StyleSheet.create({
  sevenths: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  label: { color: colors.muted, fontSize: text.sm, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: text.sm, paddingHorizontal: space[4] },
})
