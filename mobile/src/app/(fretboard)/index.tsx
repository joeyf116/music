import { Stack, router } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import DiatonicStrip from '@/components/DiatonicStrip'
import Fretboard, { Legend } from '@/components/Fretboard'
import Tab from '@/components/Tab'
import { Button, ChipRow, Field, HeaderButton, Hint, PickerRow, Section, Segmented, Stepper } from '@/components/ui'
import { impact } from '@/lib/haptics'
import { useMusic } from '@/lib/music'
import { usePref } from '@/lib/prefs'
import { colors, space, text } from '@/theme'
import { playChord, playPitch } from '@music/audio.js'
import { NECK_AREAS, randomProgression } from '@music/exercises.js'
import {
  type Active,
  type Column,
  ALL_POSITIONS,
  AREA_OPTIONS,
  DROP_OPTIONS,
  LAYOUT_OPTIONS,
  VIEWS,
  activeColumnIndex,
  columnDuration,
  columnPitches,
  fretboardView,
  headingChips,
  neckNotes,
  noteLabeller,
  progressionMood,
  progressionToken,
  tabStringNames,
} from '@music/fretboardView.js'
import { CHORDS, KEYS, SCALES, type DiatonicChord } from '@music/theory.js'

const KEY_OPTIONS = KEYS.map((k) => ({ value: k, label: k }))

/**
 * The Fretboard page, as on the web (src/components/FretboardPage.jsx) and driven by the same model
 * (src/lib/fretboardView.js): pick a key and scale, what to look at, and which one; the neck and its tab follow.
 */
export default function FretboardScreen() {
  const { keyName, setKey, scaleType, tuning, tuningId, tuningSpec, stringName, bpm, setBpm } = useMusic()
  const [storedView, setView] = usePref('music.mode')
  const [chordDegree, setChordDegree] = usePref('music.chordDegree')
  const [chordOverride, setChordOverride] = usePref('music.chordType')
  const [sevenths, setSevenths] = usePref('music.diatonicSevenths')
  const [drop, setDrop] = usePref('music.dropVoicing')
  const [labels] = usePref('music.labels')
  const [showAll] = usePref('music.showAll')
  const [layout, setLayout] = usePref('music.scaleLayout')
  const [position, setPosition] = usePref('music.fretPosition')
  const [stringSet, setStringSet] = usePref('music.stringSet')
  const [progression, setProgression] = usePref('music.fretProgression')
  const [area, setArea] = usePref('music.progressionNeck')
  const [active, setActive] = useState<Active | null>(null)
  const [playing, setPlaying] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const model = fretboardView({ view: storedView, keyName, scaleType, chordDegree, chordOverride, sevenths, drop, layout, position, stringSet, progression, area, tuning, tuningId })
  const { view, picked, overrideOk, chordType, isFourNote, badTokens, intervals, shapes, selection, heading, tabNote } = model
  const activeIndex = activeColumnIndex(model, active)

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPlaying(false)
  }, [])
  useEffect(() => stop, [selection, stop])

  const playColumn = (col: Column) => {
    const pitches = columnPitches(col, tuning)
    if (pitches.length === 1) playPitch(pitches[0])
    else if (pitches.length) playChord(pitches)
  }
  const selectColumn = (index: number, play = true) => {
    setActive({ selection, index })
    if (play && shapes.columns[index]) playColumn(shapes.columns[index])
  }
  const togglePlay = () => {
    if (playing) {
      stop()
      return
    }
    const beat = columnDuration(view, bpm)
    setPlaying(true)
    timers.current = shapes.columns.map((col, i) =>
      setTimeout(() => {
        setActive({ selection, index: i })
        playColumn(col)
      }, i * beat),
    )
    timers.current.push(setTimeout(() => setPlaying(false), shapes.columns.length * beat))
  }

  // Picking a chord in the key plays it the way the neck then shows it (its first voicing or inversion).
  const pendingPlay = useRef(false)
  useEffect(() => {
    if (!pendingPlay.current) return
    pendingPlay.current = false
    if (shapes.columns[0]) playColumn(shapes.columns[0])
  })
  const pickChord = (chord: DiatonicChord) => {
    if (view === 'progression') {
      setProgression(`${progression.trim()} ${progressionToken(chord)}`.trim())
      return
    }
    if (chord.degree === picked.degree && !overrideOk) {
      if (shapes.columns[0]) selectColumn(0)
      return
    }
    pendingPlay.current = true
    setChordDegree(chord.degree)
    setChordOverride('')
  }

  const noteLabel = noteLabeller(model, labels, tuning)
  const notes = neckNotes(model, activeIndex, showAll, tuning)
  const chips = headingChips(model, activeIndex)
  const columns = shapes.columns.map((c) => (view === 'scale' ? { ...c, label: noteLabel(c.notes[0]) } : c))

  const strip = (
    <DiatonicStrip
      keyName={keyName}
      scaleId={scaleType}
      sevenths={sevenths}
      onSeventhsChange={setSevenths}
      silent={view === 'chord' || view === 'inversion'}
      onPick={view === 'scale' ? undefined : pickChord}
      highlight={view === 'chord' || view === 'inversion' ? (c) => c.degree === picked.degree : undefined}
      title={view === 'progression' ? 'Tap chords to add them' : view === 'scale' ? undefined : `Pick a chord in ${keyName}`}
    />
  )

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <HeaderButton ios="slider.horizontal.3" android="tune" label="Neck settings" onPress={() => router.push('/settings')} /> }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <Text style={styles.summary}>See any scale, chord or inversion on the neck, hear it, then practise it.</Text>

        {/* 1. Where you are: key and scale, shared with every tab. */}
        <Section title="Key">
          <ChipRow label="Key" options={KEY_OPTIONS} value={keyName} onChange={setKey} wrap style={styles.keys} />
        </Section>
        <View style={styles.group}>
          <PickerRow label="Scale" value={SCALES[scaleType]?.name ?? 'Major'} onPress={() => router.push('/pick?id=scale')} first last />
        </View>

        {/* 2. What to look at. */}
        <Segmented options={VIEWS} value={view} onChange={setView} />

        {/* 3. Which one. */}
        {view === 'scale' && (
          <Section title="Position">
            <ChipRow
              label="Position"
              options={shapes.options.map((o, i) => ({ value: i === shapes.options.length - 1 ? ALL_POSITIONS : i, label: o.label.replace('Position ', ''), sub: o.hint }))}
              value={shapes.all ? ALL_POSITIONS : shapes.optionIndex}
              onChange={setPosition}
            />
            {!shapes.all && <Segmented options={LAYOUT_OPTIONS} value={layout === 'across' ? 'across' : 'position'} onChange={setLayout} />}
          </Section>
        )}

        {view !== 'scale' && strip}

        {(view === 'chord' || view === 'inversion') && (
          <View style={styles.group}>
            <PickerRow label="Chord type" value={overrideOk ? CHORDS[chordType].name : `As in the key (${CHORDS[picked.type].name})`} onPress={() => router.push('/pick?id=chordType')} first last />
          </View>
        )}
        {view === 'inversion' && (
          <Section title="Strings">
            {isFourNote && <Segmented options={DROP_OPTIONS} value={drop === 'drop3' ? 'drop3' : 'drop2'} onChange={setDrop} />}
            <ChipRow label="String set" options={shapes.options.map((o, i) => ({ value: i, label: o.label.replace('Strings ', '') }))} value={shapes.optionIndex} onChange={setStringSet} />
          </Section>
        )}

        {view === 'progression' && (
          <Section title="Progression">
            <Field value={progression} onChangeText={setProgression} placeholder="I V vi IV" autoCapitalize="none" autoCorrect={false} spellCheck={false} returnKeyType="done" accessibilityLabel="Progression" />
            {badTokens.length > 0 && (
              <Text style={styles.error} accessibilityRole="alert">
                Didn’t understand: {badTokens.join(', ')}. Use Roman numerals (I, ii7, bVII) or chord names (Am, F#m7).
              </Text>
            )}
            <View style={styles.buttons}>
              <Button title="Common…" onPress={() => router.push('/pick?id=progression')} />
              <Button title="Random" onPress={() => setProgression(randomProgression(progressionMood(scaleType), 4))} />
              <Button title="Clear" onPress={() => setProgression('')} disabled={!progression} />
            </View>
            <Text style={styles.label}>Neck area</Text>
            <Segmented options={AREA_OPTIONS} value={NECK_AREAS[area] ? area : 'open'} onChange={setArea} />
          </Section>
        )}

        {/* 4. The result: the neck, then its tab. */}
        <Section title={heading.title} sub={heading.sub}>
          <ChipRow
            label={view === 'progression' ? 'Chords' : 'Notes'}
            options={chips.map((c) => ({ value: c.key, label: c.name, sub: c.sub, on: c.on, tonic: c.root, column: c.index }))}
            onChange={(_, chip) => {
              if (chip.column !== undefined) selectColumn(chip.column)
            }}
          />
          <Fretboard
            tuning={tuning}
            intervals={intervals}
            notes={notes}
            label={noteLabel}
            stringName={stringName}
            onNotePress={(n) => {
              impact()
              playPitch(tuning[n.string] + n.fret)
            }}
          />
          <Legend />
          <Text style={styles.small}>
            {tuningSpec.name} · {labels === 'notes' ? 'note names' : 'intervals'} · swipe the neck for more frets
          </Text>
        </Section>

        <Section title="Tab" sub={tabNote}>
          <View style={styles.transport}>
            <Stepper label="BPM" value={bpm} onChange={setBpm} min={30} max={300} step={5} />
            <Button primary title={playing ? 'Stop' : 'Play'} onPress={togglePlay} disabled={!shapes.columns.length} style={styles.play} />
          </View>
          <View style={styles.tab}>
            {shapes.columns.length ? (
              <Tab columns={columns} tuningNames={tabStringNames(tuning, stringName)} columnWidth={shapes.columnWidth} active={activeIndex} onSelect={(i) => selectColumn(i)} />
            ) : (
              <Text style={styles.small}>Tap chords above, or pick a common progression, to see it on the neck.</Text>
            )}
          </View>
          <Hint>Tap a tab column or a note on the neck to hear it.</Hint>
        </Section>

        {view === 'scale' && strip}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  page: { paddingTop: space[2], paddingBottom: space[6], gap: space[5] },
  summary: { color: colors.muted, fontSize: text.base, lineHeight: 22, paddingHorizontal: space[4] },
  group: { gap: space[2] },
  label: { color: colors.muted, fontSize: text.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: space[4] },
  buttons: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], flexWrap: 'wrap' },
  error: { color: colors.danger, fontSize: text.sm, paddingHorizontal: space[4] },
  small: { color: colors.muted, fontSize: text.sm, paddingHorizontal: space[4] },
  transport: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] },
  play: { flex: 1 },
  tab: { paddingHorizontal: space[4] },
  keys: { justifyContent: 'space-between' },
})
