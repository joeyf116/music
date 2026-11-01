import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native'
import { playChord } from '@music/audio.js'
import { chordParts, type Chart, type ParsedChartChord } from '@music/chart.js'
import { chartChords, fretText, voicingsFor } from '@music/voicings.js'
import { PICKERS } from '@/lib/pickers'
import { useMusic } from '@/lib/music'
import { useStored } from '@/lib/prefs'
import { colors, mono, space, text } from '@/theme'
import { ChoiceRow, Disclosure, Group, HeaderButton, Hint } from '../ui'
import ChordDiagram from './ChordDiagram'
import { ChordName } from './ChartSheet'

const CARD_W = 132

function ChordCard({ symbol, chord, tuning, playing }: { symbol: string; chord: ParsedChartChord; tuning: number[]; playing: boolean }) {
  const voicings = useMemo(() => voicingsFor(chord, tuning), [chord, tuning])
  const [index, setIndex] = useState(0)
  const i = Math.min(index, Math.max(0, voicings.length - 1))
  const v = voicings[i]
  const step = (d: number) => setIndex((i + d + voicings.length) % voicings.length)
  return (
    <View style={[styles.card, playing && styles.cardPlaying]}>
      <ChordName {...chordParts(symbol)} color={colors.text} />
      {v ? (
        <>
          <Pressable onPress={() => playChord(v.notes.map((n) => n.pitch))} accessibilityRole="button" accessibilityLabel={`Play ${symbol}: ${fretText(v.frets)}`} style={({ pressed }) => [styles.shape, pressed && styles.pressed]}>
            <ChordDiagram frets={v.frets} notes={v.notes} />
            <Text style={styles.frets}>{fretText(v.frets)}</Text>
          </Pressable>
          {v.partial ? <Text style={styles.note}>simplified</Text> : null}
          {voicings.length > 1 ? (
            <View style={styles.cycle}>
              <HeaderButton ios="chevron.left" android="chevron_left" label={`Previous ${symbol} voicing`} onPress={() => step(-1)} />
              <Text style={styles.note}>
                {i + 1}/{voicings.length}
              </Text>
              <HeaderButton ios="chevron.right" android="chevron_right" label={`Next ${symbol} voicing`} onPress={() => step(1)} />
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.note}>No shape found</Text>
      )}
    </View>
  )
}

/** A fold-away strip of chord boxes for every chord in the chart; the one being played is lit and kept in view. */
export default function ChordShapes({ chart, playingSymbols, sheet }: { chart: Chart; playingSymbols: string[]; sheet: '/charts/choose' }) {
  const { tuning, tuningId, setTuningId } = useMusic()
  const [open, setOpen] = useStored('music.chordShapesOpen', false)
  const chords = useMemo(() => chartChords(chart), [chart])
  const strip = useRef<ScrollViewInstance>(null)
  const current = playingSymbols[playingSymbols.length - 1]

  useEffect(() => {
    const at = chords.findIndex((c) => c.symbol === current)
    if (open && at >= 0) strip.current?.scrollTo({ x: Math.max(0, at * (CARD_W + space[2]) - space[4]), animated: true })
  }, [open, current, chords])

  if (!chords.length) return null
  const tuningSections = PICKERS.tuning.sections().map((sec) => ({ title: sec.title ?? undefined, options: sec.options }))
  return (
    <Disclosure title="Chord shapes" summary={`${chords.length} chords`} open={open} onToggle={setOpen}>
      <Hint>Tap a shape to hear it. The arrows show more ways to play it.</Hint>
      <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {chords.map(({ symbol, chord }) => (
          <ChordCard key={symbol} symbol={symbol} chord={chord} tuning={tuning} playing={playingSymbols.includes(symbol)} />
        ))}
      </ScrollView>
      <Group>
        <ChoiceRow label="Tuning" value={tuningId} sections={tuningSections} onChange={setTuningId} sheet={sheet} first last />
      </Group>
    </Disclosure>
  )
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: space[4], gap: space[2] },
  card: { width: CARD_W, alignItems: 'center', gap: space[1], padding: space[2], borderRadius: 12, backgroundColor: colors.surface, borderWidth: 2, borderColor: 'transparent' },
  cardPlaying: { borderColor: colors.accent },
  shape: { alignItems: 'center' },
  pressed: { opacity: 0.6 },
  frets: { color: colors.muted, fontSize: text.xs, fontFamily: mono },
  note: { color: colors.muted, fontSize: text.xs },
  cycle: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
})
