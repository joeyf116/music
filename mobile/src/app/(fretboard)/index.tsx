import { Stack, router } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native'
import DiatonicStrip from '@/components/DiatonicStrip'
import Fretboard, { Legend } from '@/components/Fretboard'
import PracticeTab from '@/components/PracticeTab'
import Tab from '@/components/Tab'
import { Button, ChipRow, ChoiceRow, HeaderButton, Hint, Section, Segmented } from '@/components/ui'
import { impact } from '@/lib/haptics'
import { useMusic } from '@/lib/music'
import { scaleSections } from '@/lib/pickers'
import { getPref, usePref } from '@/lib/prefs'
import { colors, space, text, touch } from '@/theme'
import { playChord, playPitch, startDrone } from '@music/audio.js'
import { type Active, type Column, ALL_POSITIONS, VIEWS, activeColumnIndex, columnDuration, columnPitches, fretboardView, legacyView, neckNotes, noteLabeller, progressionMood, tabStringNames, type View as ViewId } from '@music/fretboardView.js'
import { startPlayback } from '@music/player.js'
import { addItem, createItem, practiceColumns, practiceScore, progressionItems, validItems, type PracticeItem } from '@music/practiceTab.js'
import { KEYS, SCALES, mod12, type DiatonicChord } from '@music/theory.js'

const KEY_OPTIONS = KEYS.map((k) => ({ value: k, label: k }))

/**
 * The Fretboard page, as on the web (src/components/FretboardPage.jsx) and driven by the same model
 * (src/lib/fretboardView.js, src/lib/practiceTab.js): pick a key, look at its scale or one voicing of a chord at a
 * time, and pin what you want into the practice tab, which plays everything pinned as one looping tab.
 */
export default function FretboardScreen() {
  const { keyName, setKey, scaleType, setScaleType, tuning, tuningId, tuningSpec, stringName, bpm, setBpm } = useMusic()
  const [storedView, setView] = usePref('music.mode')
  const [chordDegree, setChordDegree] = usePref('music.chordDegree')
  const [chordOverride, setChordOverride] = usePref('music.chordType')
  const [sevenths, setSevenths] = usePref('music.diatonicSevenths')
  const [voicingType, setVoicingType] = usePref('music.voicingType')
  const [voicingIndex, setVoicingIndex] = usePref('music.voicingIndex')
  const [labels] = usePref('music.labels')
  const [showAll] = usePref('music.showAll')
  const [layout] = usePref('music.scaleLayout')
  const [position, setPosition] = usePref('music.fretPosition')
  const [chordStyle] = usePref('music.chordStyle')
  const [storedItems, setItems] = usePref('music.practiceTab')
  const [click, setClick] = usePref('music.practiceClick')
  const [drone, setDrone] = usePref('music.practiceDrone')
  const items = useMemo(() => validItems(storedItems), [storedItems])

  const model = fretboardView({ view: storedView, keyName, scaleType, chordDegree, chordOverride, sevenths, voicingType, voicingIndex, layout, position, tuning, tuningId })
  const { view, picked, overrideOk, shapes, selection, heading, tabNote, keyPc, voicings, voicingTypes, pin } = model

  // Views saved before Inversions, CAGED and Progressions moved into Chords open where they now live.
  useEffect(() => {
    const old = legacyView(storedView, getPref('music.dropVoicing'))
    if (!old) return
    setView(old.view)
    setVoicingType(old.voicingType)
    setVoicingIndex(0)
    if (old.progression && !items.length) setItems(progressionItems(getPref('music.fretProgression') || 'I V vi IV', keyName, tuning, tuningId).items)
    // Only the stored view matters here: this runs once, when an old one is found.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedView])

  // ---- The neck's own tab: tap a column to hear it, Listen plays it through once ----
  const [active, setActive] = useState<Active | null>(null)
  const [listening, setListening] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const activeIndex = activeColumnIndex(model, active)
  const stopListening = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setListening(false)
  }, [])
  useEffect(() => stopListening, [selection, stopListening])
  const playColumn = (col: Pick<Column, 'notes'>) => {
    const pitches = columnPitches(col, tuning).filter((p) => !Number.isNaN(p))
    if (pitches.length === 1) playPitch(pitches[0])
    else if (pitches.length) playChord(pitches)
  }
  const selectColumn = (index: number) => {
    setActive({ selection, index })
    if (shapes.columns[index]) playColumn(shapes.columns[index])
  }

  // ---- The practice tab's playback, shared by the practice tab and the mini bar ----
  const [playing, setPlaying] = useState(false)
  const [practiceActive, setPracticeActive] = useState<number | null>(null)
  const practice = useMemo(() => practiceColumns(items), [items])
  const score = useMemo(() => practiceScore(items, tuning, chordStyle), [items, tuning, chordStyle])
  useEffect(() => {
    if (!playing) return undefined
    return startPlayback(score, {
      bpm: Math.max(30, Math.min(300, Number(bpm) || 100)),
      loop: true,
      click,
      onStep: (index) => {
        if (index >= 0) setPracticeActive(score.events[index]?.column ?? null)
      },
      onEnd: () => setPlaying(false),
    })
  }, [playing, score, bpm, click])
  const dronePitch = 40 + mod12(keyPc - 4)
  useEffect(() => (playing && drone ? startDrone(dronePitch) : undefined), [playing, drone, dronePitch])
  const togglePractice = () => {
    if (!playing) stopListening()
    setPlaying(!playing)
  }
  const toggleListen = () => {
    if (listening) {
      stopListening()
      return
    }
    setPlaying(false)
    setListening(true)
    let at = 0
    timers.current = shapes.columns.map((col, i) => {
      const t = setTimeout(() => {
        setActive({ selection, index: i })
        playColumn(col)
      }, at)
      at += columnDuration(col, bpm)
      return t
    })
    timers.current.push(setTimeout(() => setListening(false), at))
  }

  // ---- Pinning ----
  const [justPinned, setJustPinned] = useState(false)
  useEffect(() => {
    if (!justPinned) return undefined
    const t = setTimeout(() => setJustPinned(false), 1500)
    return () => clearTimeout(t)
  }, [justPinned])
  const pinIt = () => {
    if (!pin) return
    impact()
    setItems((list) => addItem(validItems(list), createItem(pin)))
    setJustPinned(true)
  }
  const changeItems = (next: PracticeItem[]) => {
    if (!next.length) setPlaying(false)
    setItems(next)
  }
  const startFrom = (progression: string) => setItems((list) => [...validItems(list), ...progressionItems(progression, keyName, tuning, tuningId).items])

  // ---- Choosing what the neck shows: stepping to a voicing or picking a chord plays it ----
  const pendingPlay = useRef(false)
  useEffect(() => {
    if (!pendingPlay.current) return
    pendingPlay.current = false
    if (shapes.columns[0]) playColumn(shapes.columns[0])
  })
  const stepVoicing = (delta: number) => {
    if (!voicings.length) return
    pendingPlay.current = true
    setVoicingIndex((model.voicingIndex + delta + voicings.length) % voicings.length)
  }
  const pickChord = (chord: DiatonicChord) => {
    pendingPlay.current = true
    if (view !== 'chord') setView('chord')
    if (chord.degree !== picked.degree || overrideOk) setVoicingIndex(0)
    setChordDegree(chord.degree)
    setChordOverride('')
  }

  const scroller = useRef<ScrollViewInstance>(null)
  const practiceY = useRef(0)
  const noteLabel = noteLabeller(model, labels, tuning)
  const notes = neckNotes(model, activeIndex, showAll, tuning)
  const columns = shapes.columns.map((c) => (c.notes.length === 1 ? { ...c, label: noteLabel(c.notes[0]) } : c))
  const tuningNames = tabStringNames(tuning, stringName)
  const voicing = voicings[model.voicingIndex]

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <HeaderButton ios="slider.horizontal.3" android="tune" label="Settings" onPress={() => router.push('/settings')} /> }} />
      <ScrollView ref={scroller} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.page, items.length > 0 && styles.pageWithBar]}>
        <Text style={styles.summary}>Find a voicing in any key and pin it to practise.</Text>

        {/* 1. Where you are: the key, its chords, the scale and what to look at. */}
        <ChipRow label="Key" options={KEY_OPTIONS} value={keyName} onChange={setKey} />
        <DiatonicStrip keyName={keyName} scaleId={scaleType} sevenths={sevenths} onSeventhsChange={setSevenths} silent onPick={pickChord} highlight={view === 'chord' ? (c) => c.degree === picked.degree : undefined} title={`Chords in ${keyName}`} />
        <View style={styles.group}>
          <ChoiceRow label="Scale" value={SCALES[scaleType] ? scaleType : 'major'} sections={scaleSections()} onChange={setScaleType} sheet="/choose" title="Scale or mode" first last />
        </View>
        <View style={styles.pad}>
          <Segmented<ViewId> options={VIEWS} value={view} onChange={setView} />
        </View>

        {/* 2. Which one: a scale position, or a voicing type for the chord. */}
        {view === 'scale' ? (
          <ChipRow
            label="Position"
            options={shapes.options.map((o, i) => ({ value: i === shapes.options.length - 1 ? ALL_POSITIONS : i, label: o.label.replace('Position ', ''), sub: o.hint }))}
            value={shapes.all ? ALL_POSITIONS : shapes.optionIndex}
            onChange={setPosition}
          />
        ) : (
          <View style={styles.pad}>
            <Segmented
              options={voicingTypes}
              value={model.voicingType}
              onChange={(t) => {
                pendingPlay.current = true
                setVoicingType(t)
                setVoicingIndex(0)
              }}
            />
          </View>
        )}

        {/* 3. The neck, the one voicing or position on it, and Pin. */}
        <Section title={heading.title} sub={heading.sub}>
          <Fretboard
            tuning={tuning}
            intervals={model.intervals}
            notes={notes}
            label={noteLabel}
            stringName={stringName}
            onNotePress={(n) => {
              impact()
              playPitch(tuning[n.string] + n.fret)
            }}
          />
          <Legend />
          {view === 'chord' && (
            <View style={styles.stepper}>
              <Pressable onPress={() => stepVoicing(-1)} disabled={voicings.length < 2} accessibilityRole="button" accessibilityLabel="Previous voicing" style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
                <Text style={styles.stepSign}>‹</Text>
              </Pressable>
              <View style={styles.stepLabel} accessibilityLiveRegion="polite">
                <Text style={styles.stepName}>{voicing ? voicing.label : 'No voicings in this tuning'}</Text>
                {voicing ? <Text style={styles.stepHint}>{`${voicing.hint} · ${model.voicingIndex + 1} of ${voicings.length}`}</Text> : null}
              </View>
              <Pressable onPress={() => stepVoicing(1)} disabled={voicings.length < 2} accessibilityRole="button" accessibilityLabel="Next voicing" style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
                <Text style={styles.stepSign}>›</Text>
              </Pressable>
            </View>
          )}
          {columns.length > 0 && (
            <View style={styles.pad}>
              {tabNote ? <Text style={styles.tabNote}>{tabNote}</Text> : null}
              <Tab columns={columns} tuningNames={tuningNames} columnWidth={shapes.columnWidth} active={activeIndex} onSelect={(i) => selectColumn(i)} />
            </View>
          )}
          <View style={styles.pinRow}>
            <Button title={justPinned ? '✓ Pinned' : '＋ Pin to practice tab'} onPress={pinIt} disabled={!pin} style={styles.pin} />
            <Button title={listening ? 'Stop' : 'Listen'} onPress={toggleListen} disabled={!columns.length} />
          </View>
          <Hint>Tap a note on the neck or a tab column to hear it.</Hint>
        </Section>

        {/* 4. Everything pinned, as one looping tab. */}
        <View
          onLayout={(e) => {
            practiceY.current = e.nativeEvent.layout.y
          }}
        >
          <PracticeTab
            items={items}
            onItemsChange={changeItems}
            onStartFrom={startFrom}
            mood={progressionMood(scaleType)}
            playing={playing}
            onTogglePlay={togglePractice}
            active={practiceActive}
            onSelectColumn={(i) => {
              setPracticeActive(i)
              if (practice.columns[i]) playColumn(practice.columns[i])
            }}
            bpm={bpm}
            onBpmChange={setBpm}
            click={click}
            onClickChange={setClick}
            drone={drone}
            onDroneChange={setDrone}
            droneName={keyName}
            tuningId={tuningId}
            tuningNames={tuningNames}
          />
        </View>
        <Text style={styles.small}>{tuningSpec.name} · swipe the neck for more frets</Text>
      </ScrollView>

      {/* The practice tab is always one tap away, just above the tab bar. */}
      {items.length > 0 && (
        <View style={styles.bar}>
          <Pressable style={styles.barOpen} onPress={() => scroller.current?.scrollTo({ y: practiceY.current, animated: true })} accessibilityRole="button" accessibilityLabel={`Practice tab, ${items.length} items. Show it`}>
            <Text style={styles.barText}>
              <Text style={styles.barStrong}>Practice tab</Text> · {items.length} {items.length === 1 ? 'item' : 'items'}
            </Text>
          </Pressable>
          <Button primary title={playing ? '■' : '▶'} onPress={togglePractice} style={styles.barPlay} />
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  page: { paddingTop: space[2], paddingBottom: space[6], gap: space[4] },
  pageWithBar: { paddingBottom: space[6] + 64 },
  summary: { color: colors.muted, fontSize: text.base, lineHeight: 22, paddingHorizontal: space[4] },
  group: { gap: space[2] },
  pad: { paddingHorizontal: space[4], gap: space[1] },
  small: { color: colors.muted, fontSize: text.sm, paddingHorizontal: space[4] },
  tabNote: { color: colors.muted, fontSize: text.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4] },
  stepButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.surface },
  stepSign: { color: colors.text, fontSize: text.xl, fontWeight: '600' },
  stepLabel: { flex: 1, alignItems: 'center' },
  stepName: { color: colors.text, fontSize: text.base, fontWeight: '700', textAlign: 'center' },
  stepHint: { color: colors.muted, fontSize: text.sm },
  pressed: { opacity: 0.6 },
  pinRow: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4] },
  pin: { flex: 1, borderColor: colors.accent, borderWidth: 1 },
  bar: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    bottom: space[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[1],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  barOpen: { flex: 1, minHeight: touch, justifyContent: 'center', paddingHorizontal: space[3] },
  barText: { color: colors.text, fontSize: text.base },
  barStrong: { fontWeight: '700' },
  barPlay: { minWidth: 56 },
})
