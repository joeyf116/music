import { StyleSheet, Text, View } from 'react-native'
import { playChord } from '@music/audio.js'
import { SCALES, diatonicChords, sevenNoteScale, type DiatonicChord } from '@music/theory.js'
import { colors, space, text } from '@/theme'
import { ChipRow, PlatformSwitch, Section, type Chip } from './ui'

// Close voicing around C3–B3, so every chord in the strip sounds in the same register.
const chordPitches = (chord: DiatonicChord) => chord.intervals.map((i) => 48 + chord.rootPc + i)

interface DiatonicStripProps {
  keyName: string
  scaleId: string
  sevenths: boolean
  onSeventhsChange: (sevenths: boolean) => void
  /** Hands the tapped chord to the page (show it on the neck, add it to a progression). */
  onPick?: (chord: DiatonicChord) => void
  highlight?: (chord: DiatonicChord) => boolean
  /** The page plays the chord itself, as it is voiced on the neck. */
  silent?: boolean
  title?: string
}

type ChordChip = Chip<number> & { chord: DiatonicChord }

/** The chords of the current key and mode (I ii iii IV V vi vii° …) as a row of buttons. Tapping plays one. */
export default function DiatonicStrip({ keyName, scaleId, sevenths, onSeventhsChange, onPick, highlight, silent = false, title }: DiatonicStripProps) {
  const modeId = sevenNoteScale(scaleId)
  const chords = diatonicChords(keyName, modeId, sevenths)
  const pick = (chord: DiatonicChord) => {
    if (!silent) playChord(chordPitches(chord))
    onPick?.(chord)
  }
  const chips: ChordChip[] = chords.map((c) => ({ value: c.degree, top: c.numeral, label: c.name, on: highlight?.(c), tonic: c.degree === 0, a11y: `${c.numeral}: ${c.name}`, chord: c }))
  return (
    <Section
      title={title ?? `Chords in ${chords[0].rootName} ${SCALES[modeId].name}`}
      right={
        <View style={styles.sevenths}>
          <Text style={styles.label}>7ths</Text>
          <PlatformSwitch value={sevenths} onChange={onSeventhsChange} label="Show 7th chords" />
        </View>
      }
    >
      <ChipRow label="Chords in this key" options={chips} onChange={(_, chip) => pick(chip.chord)} />
    </Section>
  )
}

const styles = StyleSheet.create({
  sevenths: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  label: { color: colors.muted, fontSize: text.sm, fontWeight: '600' },
})
