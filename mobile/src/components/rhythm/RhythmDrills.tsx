import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { playEvent, startPlayback } from '@music/player.js'
import { PLAY_ON, RHYTHMS, RHYTHM_LEVELS, clampBpm, parseBeats, regridBeat, rhythmById, rhythmCells, rhythmScore, toggleCell, type RhythmPreset } from '@music/rhythm.js'
import { BEAT_GRIDS, DRILL_MODES, RHYTHM_DRILL_DEFAULTS, RHYTHM_DRILL_KEY, RHYTHM_STEPS, rhythmColumnWidth, type MetronomeSettings, type RhythmDrill } from '@music/rhythmView.js'
import { noteToPc } from '@music/theory.js'
import { tabStringNames } from '@music/fretboardView.js'
import { selection } from '@/lib/haptics'
import { useStored } from '@/lib/prefs'
import useTapJudge from '@/lib/useTapJudge'
import { colors, space, text } from '@/theme'
import Tab from '../Tab'
import { Button, ChipRow, ChoiceRow, Disclosure, Group, HeaderButton, Hint, Notice, Segmented, Stepper, SwitchRow, TextButton } from '../ui'
import { RHYTHM_SHEET, type MetronomePatch } from './Metronome'
import TapPad, { TapResults } from './TapPad'

const LEVEL_SECTIONS = [{ options: RHYTHM_LEVELS.map((l) => ({ value: l.id, label: `${l.id}. ${l.name}` })) }]
const PLAY_ON_SECTIONS = [{ options: PLAY_ON.map((p) => ({ value: p.value, label: p.label, sub: p.title })) }]
const MODE_OPTIONS = DRILL_MODES.map((m) => ({ value: m.value, label: m.label }))
const GRID_OPTIONS = BEAT_GRIDS.map((g) => ({ value: String(g.value), label: g.label }))

/** Another rhythm from the same level, at random. */
const randomRhythm = (inLevel: RhythmPreset[], current: string) => {
  const options = inLevel.filter((r) => r.id !== current)
  return options[Math.floor(Math.random() * options.length)] ?? inLevel[0]
}

interface RhythmDrillsProps {
  tuning: number[]
  stringName: (string: number) => string
  keyName: string
  minor: boolean
  settings: MetronomeSettings
  update: (patch: MetronomePatch) => void
}

/**
 * Strumming rhythm drills: pick a rhythm, see it on a counting grid and in tab with strum directions, hear it,
 * then play along (or tap it) and get timing feedback. Turn on editing to write your own.
 */
export default function RhythmDrills({ tuning, stringName, keyName, minor, settings, update }: RhythmDrillsProps) {
  const [stored, setStored] = useStored<Partial<RhythmDrill>>(RHYTHM_DRILL_KEY, RHYTHM_DRILL_DEFAULTS)
  const drill: RhythmDrill = { ...RHYTHM_DRILL_DEFAULTS, ...stored }
  const set = (patch: Partial<RhythmDrill>) => setStored({ ...drill, ...patch })
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const [countBeat, setCountBeat] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const judge = useTapJudge(Number(settings.tapCorrection) || 0)
  const { addTarget, clearTargets } = judge

  const bpm = clampBpm(settings.bpm)
  const preset = rhythmById(drill.rhythm)
  const custom = !preset || preset.beats !== drill.beats
  const level = RHYTHM_LEVELS.find((l) => l.id === drill.level) ?? RHYTHM_LEVELS[0]
  const inLevel = RHYTHMS.filter((r) => r.level === level.id)
  const cells = rhythmCells(drill.beats)
  const beats = parseBeats(drill.beats)
  const pattern = stored.beats ?? RHYTHM_DRILL_DEFAULTS.beats
  const playOn = stored.playOn ?? RHYTHM_DRILL_DEFAULTS.playOn
  const score = useMemo(() => rhythmScore(pattern, { bars: 2, tuning, playOn, rootPc: noteToPc(keyName), minor }), [pattern, tuning, playOn, keyName, minor])
  // The click can follow the grid of the pattern's busiest beat, for counting the in-between notes.
  const finest = Math.max(...beats.map((b) => b.length))
  const clickGrid = drill.clickGrid && finest > 1 ? finest : 1

  const started = useRef(false)
  useEffect(() => {
    if (!playing) {
      started.current = false
      return
    }
    clearTargets()
    const stop = startPlayback(score, {
      bpm,
      loop: true,
      countIn: drill.countIn && !started.current,
      click: true,
      subdivision: Array.from({ length: clickGrid }, (_, i) => i / clickGrid),
      clickVolume: settings.volume,
      silent: drill.mode === 'along',
      onStep: (index, count) => {
        setCountBeat(count ?? null)
        if (index >= 0) setActive(index)
      },
      onHit: addTarget,
    })
    started.current = true
    return () => {
      stop()
      setCountBeat(null)
    }
  }, [playing, score, bpm, drill.mode, clickGrid, drill.countIn, settings.volume, addTarget, clearTargets])

  const toggle = () => {
    if (!playing) {
      setActive(null)
      setEditing(false)
    }
    setPlaying(!playing)
  }
  const pick = (r: RhythmPreset) => set({ rhythm: r.id, beats: r.beats, level: r.level })
  const step = (d: number) => {
    const index = RHYTHMS.findIndex((r) => r.id === drill.rhythm)
    pick(RHYTHMS[(index + d + RHYTHMS.length) % RHYTHMS.length])
  }
  const random = () => pick(randomRhythm(inLevel, drill.rhythm))

  const activeCell = active === null ? null : active % cells.length
  const columns = score.events.map((e) => ({ notes: e.notes, label: e.label, sublabel: e.count, groupStart: e.barStart }))
  const hits = cells.filter((c) => c.hit).length

  return (
    <View style={styles.wrap}>
      <Group>
        <ChoiceRow label="Level" value={level.id} sections={LEVEL_SECTIONS} onChange={(id) => pick(RHYTHMS.find((r) => r.level === id) ?? RHYTHMS[0])} sheet={RHYTHM_SHEET} first last />
      </Group>
      <ChipRow label={`${level.name} rhythms`} options={inLevel.map((r) => ({ value: r.id, label: r.name }))} value={custom ? null : drill.rhythm} onChange={(id) => pick(rhythmById(id) ?? RHYTHMS[0])} />
      <Hint>{level.about}</Hint>

      <View style={styles.head}>
        <HeaderButton ios="chevron.left" android="chevron_left" label="Previous rhythm" onPress={() => step(-1)} />
        <View style={styles.title}>
          <Text style={styles.name} numberOfLines={1}>
            {custom ? 'Your rhythm' : preset.name}
          </Text>
          <Text style={styles.meta}>
            {beats.length}/4 · {hits} {hits === 1 ? 'strum' : 'strums'} a bar
          </Text>
        </View>
        <HeaderButton ios="chevron.right" android="chevron_right" label="Next rhythm" onPress={() => step(1)} />
        <HeaderButton ios="dice" android="casino" label="A random rhythm from this level" onPress={random} />
      </View>

      {/* The counting grid: say the counts, strum on the filled boxes. Tap a box to hear it, or to change it while editing. */}
      <View style={styles.grid}>
        {beats.map((b, beat) => (
          <View key={beat} style={[styles.beat, { width: `${100 / (editing ? Math.min(2, beats.length) : Math.min(4, beats.length))}%` }]}>
            <View style={styles.cells}>
              {cells
                .filter((c) => c.beat === beat)
                .map((c) => {
                  const index = cells.indexOf(c)
                  const now = index === activeCell
                  return (
                    <Pressable
                      key={c.cell}
                      onPress={() => {
                        if (editing) {
                          selection()
                          set({ beats: toggleCell(drill.beats, beat, c.cell) })
                        } else if (c.hit) playEvent(score.events[index])
                      }}
                      accessibilityRole="button"
                      accessibilityState={editing ? { checked: c.hit } : undefined}
                      accessibilityLabel={`${c.count || beat + 1}: ${c.hit ? `strum ${c.strum}` : 'rest'}`}
                      style={[styles.cell, c.cell === 0 && styles.downbeat, c.hit && styles.hit, now && styles.now]}
                    >
                      <Text style={[styles.count, c.hit && styles.hitText]}>{c.count}</Text>
                      <Text style={[styles.strum, c.hit && styles.hitText]}>{c.hit ? (c.strum === 'up' ? '↑' : '↓') : ' '}</Text>
                    </Pressable>
                  )
                })}
            </View>
            {editing ? <Segmented options={GRID_OPTIONS} value={String(b.length)} onChange={(size) => set({ beats: regridBeat(drill.beats, beat, Number(size)) })} style={styles.beatGrid} /> : null}
          </View>
        ))}
      </View>
      <Group>
        <SwitchRow label="Edit rhythm" value={editing} onChange={setEditing} first last />
      </Group>
      {custom && preset ? (
        <View style={styles.pad}>
          <TextButton title={`Reset to “${preset.name}”`} onPress={() => set({ beats: preset.beats })} />
        </View>
      ) : null}

      <Segmented options={MODE_OPTIONS} value={drill.mode} onChange={(mode) => set({ mode })} />
      <View style={styles.transport}>
        <Stepper label="BPM" value={settings.bpm} onChange={(v) => update({ bpm: v })} min={30} max={300} step={5} />
        <Button primary title={playing ? 'Stop' : 'Play'} onPress={toggle} style={styles.play} />
      </View>
      {countBeat ? <Notice>Count-in {countBeat}…</Notice> : null}

      <Group>
        <ChoiceRow label="Sound on" value={drill.playOn} sections={PLAY_ON_SECTIONS} onChange={(playOn) => set({ playOn })} sheet={RHYTHM_SHEET} first />
        <SwitchRow label="Click the subdivisions" value={drill.clickGrid} onChange={(clickGrid) => set({ clickGrid })} />
        <SwitchRow label="Count-in" value={drill.countIn} onChange={(countIn) => set({ countIn })} />
        <SwitchRow label="Show as tab" value={drill.showTab} onChange={(showTab) => set({ showTab })} last />
      </Group>

      {drill.showTab ? (
        <View style={styles.tab}>
          <Tab columns={columns} tuningNames={tabStringNames(tuning, stringName)} columnWidth={rhythmColumnWidth(finest)} active={active} onSelect={(i) => !playing && score.events[i]?.notes.length && playEvent(score.events[i])} />
        </View>
      ) : null}

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Tap it
      </Text>
      <Hint>Press Play, then tap the rhythm (not the beat) on the pad. Each tap is checked against the nearest strum.</Hint>
      <TapPad judge={judge} disabled={!playing} idle={playing ? 'Tap the rhythm here' : 'Press Play, then tap the rhythm here'} label="Tap the rhythm" />
      <TapResults judge={judge} />

      <Disclosure title="How to practise a rhythm">
        {RHYTHM_STEPS.map(([lead, rest], i) => (
          <Text key={lead} style={styles.step}>
            {i + 1}. <Text style={styles.strong}>{lead}</Text> {rest}
          </Text>
        ))}
      </Disclosure>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4] },
  title: { flex: 1, alignItems: 'center' },
  name: { color: colors.text, fontSize: text.lg, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: text.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space[3], rowGap: space[3] },
  beat: { paddingHorizontal: space[1], gap: space[2] },
  cells: { flexDirection: 'row', gap: 2 },
  cell: { flex: 1, minHeight: 56, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 2 },
  downbeat: { borderColor: colors.borderStrong },
  hit: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  now: { backgroundColor: colors.accent },
  count: { color: colors.muted, fontSize: text.xs, fontWeight: '600' },
  strum: { color: colors.text, fontSize: text.lg, fontWeight: '700' },
  hitText: { color: colors.text },
  beatGrid: { marginHorizontal: 0, height: 30 },
  pad: { paddingHorizontal: space[4], alignItems: 'flex-start' },
  tab: { paddingHorizontal: space[4] },
  transport: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] },
  play: { flex: 1, minHeight: 52 },
  sectionTitle: { color: colors.text, fontSize: text.lg, fontWeight: '700', paddingHorizontal: space[4] },
  step: { color: colors.text, fontSize: text.base, lineHeight: 22, paddingHorizontal: space[4] },
  strong: { fontWeight: '700' },
})
