import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { DEFAULT_SETTINGS, PROGRESSIONS, buildExercise, randomProgression, type ExerciseSettings } from '@music/exercises.js'
import {
  SPEED_UPS,
  exerciseColumnWidth,
  exerciseColumns,
  exerciseFields,
  exerciseLayoutField,
  exerciseMenu,
  exerciseNeckLabel,
  exerciseNeckNotes,
  exercisePositions,
  exerciseTitle,
  isMelodic,
  type ExerciseField,
  type FieldValue,
} from '@music/exerciseView.js'
import { progressionToken, tabStringNames } from '@music/fretboardView.js'
import { playEvent, startPlayback } from '@music/player.js'
import { KEYS, sevenNoteScale } from '@music/theory.js'
import { choose } from '@/lib/choose'
import { useMusic } from '@/lib/music'
import { usePref, useStored } from '@/lib/prefs'
import { colors, space, text } from '@/theme'
import DiatonicStrip from '../DiatonicStrip'
import Fretboard from '../Fretboard'
import Tab from '../Tab'
import { Button, ChipRow, ChoiceRow, Disclosure, Field, Group, Hint, Notice, Section, Segmented, Stepper, SwitchRow } from '../ui'
import { RHYTHM_SHEET } from './Metronome'

const KEY_OPTIONS = KEYS.map((k) => ({ value: k, label: k }))
const MENU = exerciseMenu().map((g) => ({ title: g.group, options: g.options }))
const SPEED_OPTIONS = SPEED_UPS.map((n) => ({ value: String(n), label: n ? `+${n}` : 'Off' }))
const clampBpm = (bpm: number) => Math.max(30, Math.min(300, Number(bpm) || 80))

/** One exercise setting as a native control: a list row, a segmented control or a stepper. */
function FieldControl({ field, onChange, first, last }: { field: ExerciseField; onChange: (value: FieldValue) => void; first: boolean; last: boolean }) {
  const options = field.options ?? []
  if (field.kind === 'select') {
    return <ChoiceRow label={field.label} value={field.value} sections={[{ options: options.map((o) => ({ value: o.value, label: o.label, disabled: o.disabled })) }]} onChange={onChange} sheet={RHYTHM_SHEET} first={first} last={last} />
  }
  return null
}

/** Segmented controls and steppers sit under the list rows, each with its label. */
function InlineControl({ field, onChange }: { field: ExerciseField; onChange: (value: FieldValue) => void }) {
  if (field.kind === 'stepper') {
    return (
      <View style={styles.inline}>
        <Text style={styles.label}>{field.label}</Text>
        <View style={styles.stepper}>
          <Stepper label={field.label.toUpperCase()} value={Number(field.value)} onChange={onChange} min={field.min ?? 0} max={field.max ?? 99} />
        </View>
      </View>
    )
  }
  const options = (field.options ?? []).map((o) => ({ value: String(o.value), label: o.label }))
  return (
    <View style={styles.inline}>
      <Text style={styles.label}>{field.label}</Text>
      <Segmented options={options} value={String(field.value)} onChange={(v) => onChange((field.options ?? []).find((o) => String(o.value) === v)?.value ?? v)} />
    </View>
  )
}

/** Generated practice exercises (scales, arpeggios, progressions, fingerstyle) with tab that plays along in time. */
export default function Drills() {
  const { keyName, setKey, scaleType, setScaleType, tuning, stringName } = useMusic()
  const [stored, setStored] = useStored<ExerciseSettings>('music.exercises', DEFAULT_SETTINGS)
  const [bpm, setBpm] = useStored('music.exerciseBpm', 80)
  const [loop, setLoop] = useStored('music.exerciseLoop', true)
  const [countIn, setCountIn] = useStored('music.exerciseCountIn', true)
  const [click, setClick] = useStored('music.exerciseClick', true)
  const [speedUp, setSpeedUp] = useStored('music.exerciseSpeedUp', 0)
  const [labels, setLabels] = useStored<'notes' | 'degrees'>('music.exerciseLabels', 'notes')
  const [sevenths, setSevenths] = usePref('music.diatonicSevenths')
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const [countBeat, setCountBeat] = useState<number | null>(null)
  const [liveBpm, setLiveBpm] = useState<number | null>(null)

  // Key and scale are shared with the Fretboard tab, so the mode carries over. Exercises that need a seven-note
  // scale use the parent of a pentatonic or blues scale.
  const score = useMemo(() => buildExercise({ ...stored, key: keyName, scale: scaleType, scale7: sevenNoteScale(scaleType) }, tuning), [stored, keyName, scaleType, tuning])
  const s = score.settings
  const { exercise, meter, events } = score
  const has = (control: string) => exercise.controls.includes(control)
  const set = ({ key, scale, scale7, ...rest }: ExerciseSettings) => {
    if (typeof key === 'string') setKey(key)
    const nextScale = scale ?? scale7
    if (typeof nextScale === 'string') setScaleType(nextScale)
    if (Object.keys(rest).length) setStored({ ...stored, ...rest })
  }
  const tempo = clampBpm(bpm)

  // Restart in time whenever the exercise or tempo changes mid-play; only the first start counts in.
  const started = useRef(false)
  useEffect(() => {
    if (!playing) {
      started.current = false
      return
    }
    const stop = startPlayback(score, {
      bpm: tempo,
      loop,
      countIn: countIn && !started.current,
      click,
      speedUp: loop ? speedUp : 0,
      onStep: (index, count) => {
        setCountBeat(count ?? null)
        if (index >= 0) setActive(index)
      },
      onBpm: setLiveBpm,
      onEnd: () => setPlaying(false),
    })
    started.current = true
    return () => {
      stop()
      setCountBeat(null)
      setLiveBpm(null)
    }
  }, [playing, score, tempo, loop, countIn, click, speedUp])

  const togglePlay = () => {
    if (!playing) setActive(null)
    setPlaying(!playing)
  }
  const selectColumn = (index: number) => {
    setActive(index)
    if (!playing && events[index]?.notes.length) playEvent(events[index])
  }

  const activeIndex = active !== null && active < events.length ? active : null
  const melodic = isMelodic(score)
  const fields = exerciseFields(score, tuning, stringName)
  const rows = fields.filter((f) => f.kind === 'select')
  const inline = fields.filter((f) => f.kind !== 'select')
  const layoutField = exerciseLayoutField(score)
  const positions = exercisePositions(score, tuning)
  const change = (field: ExerciseField) => (value: FieldValue) => set({ [field.id]: value, ...(field.resetsPosition ? { position: 0 } : {}) })

  return (
    <View style={styles.wrap}>
      <Group>
        <ChoiceRow label="Exercise" value={exercise.id} sections={MENU} onChange={(id) => set({ exercise: id })} sheet={RHYTHM_SHEET} first last />
      </Group>
      <Disclosure title="Why practise this?">
        <Hint>{exercise.about}</Hint>
        <Hint>Start slow enough to play it perfectly, then let “Speed up” push the tempo a little each time round.</Hint>
      </Disclosure>

      {has('key') ? (
        <Section title="Key">
          <ChipRow label="Key" options={KEY_OPTIONS} value={s.key} onChange={(k) => set({ key: k })} wrap style={styles.keys} />
        </Section>
      ) : null}

      {has('progression') ? (
        <Section title="Progression">
          <Field value={s.progression} onChangeText={(progression) => set({ progression })} placeholder="I V vi IV" autoCapitalize="none" autoCorrect={false} spellCheck={false} returnKeyType="done" accessibilityLabel="Progression" />
          {score.errors.length > 0 ? (
            <Text style={styles.error} accessibilityRole="alert">
              Didn’t understand: {score.errors.join(', ')}. Use Roman numerals (I, ii7, bVII) or chord names (Am, F#m7).
            </Text>
          ) : null}
          <View style={styles.buttons}>
            <Button
              title="Common…"
              onPress={() => choose(RHYTHM_SHEET, { title: 'Common progressions', sections: [{ options: PROGRESSIONS.map((p) => ({ value: p.text, label: p.name, sub: p.text })) }], value: s.progression, onChoose: (progression) => set({ progression }) })}
            />
            <Button title="Random major" onPress={() => set({ progression: randomProgression('major', 4), scale: 'major' })} />
            <Button title="Random minor" onPress={() => set({ progression: randomProgression('minor', 4), scale: 'minor' })} />
          </View>
          <DiatonicStrip keyName={s.key} scaleId={s.scale} sevenths={sevenths} onSeventhsChange={setSevenths} onPick={(c) => set({ progression: `${s.progression.trim()} ${progressionToken(c)}`.trim() })} title="Tap chords to add them" />
        </Section>
      ) : null}

      <Group>
        {rows.map((field, i) => (
          <FieldControl key={field.id} field={field} onChange={change(field)} first={i === 0} last={i === rows.length - 1} />
        ))}
      </Group>
      {inline.map((field) => (
        <InlineControl key={field.id} field={field} onChange={change(field)} />
      ))}
      {layoutField ? <InlineControl field={layoutField} onChange={change(layoutField)} /> : null}

      {positions.length > 0 ? (
        <Section title={s.layout === 'across' ? 'Starts in position' : 'Position'}>
          <ChipRow label="Position" options={positions.map((p, i) => ({ value: i, label: p.label, sub: p.hint }))} value={Math.min(s.position, positions.length - 1)} onChange={(position) => set({ position })} />
        </Section>
      ) : null}

      <Section title={exerciseTitle(score)} sub={`${meter.id} · ${score.bars} ${score.bars === 1 ? 'bar' : 'bars'}`}>
        {melodic ? (
          <Segmented
            options={[
              { value: 'notes', label: 'Notes' },
              { value: 'degrees', label: exercise.id === 'chromatic' ? 'Fingers' : 'Intervals' },
            ]}
            value={labels === 'notes' ? 'notes' : 'degrees'}
            onChange={setLabels}
          />
        ) : null}
        <View style={styles.transport}>
          <Stepper label={meter.unit === 8 ? 'BPM (8THS)' : 'BPM'} value={bpm} onChange={setBpm} min={30} max={300} step={5} />
          <Button primary title={playing ? 'Stop' : 'Play'} onPress={togglePlay} disabled={!events.length} style={styles.play} />
        </View>
        {countBeat || liveBpm ? <Notice>{countBeat ? `Count-in ${countBeat}…` : `Now ${liveBpm} BPM`}</Notice> : null}
        <Disclosure title="Playback" summary={[click && 'Click', countIn && 'Count-in', loop && 'Loop'].filter(Boolean).join(' · ') || 'No click'}>
          <Group>
            <SwitchRow label="Click" value={click} onChange={setClick} first />
            <SwitchRow label="Count-in" value={countIn} onChange={setCountIn} />
            <SwitchRow label="Loop" value={loop} onChange={setLoop} last />
          </Group>
          <Text style={styles.label}>Speed up each loop (BPM)</Text>
          <Segmented options={SPEED_OPTIONS} value={String(loop ? speedUp : 0)} onChange={(v) => loop && setSpeedUp(Number(v))} />
        </Disclosure>
        <View style={styles.tab}>
          <Tab columns={exerciseColumns(score, labels)} tuningNames={tabStringNames(tuning, stringName)} columnWidth={exerciseColumnWidth(score)} active={activeIndex} onSelect={selectColumn} />
        </View>
        <Hint>{has('progression') ? '↓ ↑ = down / up strum · p = thumb, i m a = fingers · ' : ''}Tap a column to hear it.</Hint>
      </Section>

      <Fretboard tuning={tuning} notes={exerciseNeckNotes(score, activeIndex)} label={(n) => exerciseNeckLabel(score, labels, { ...n, pitch: tuning[n.string] + n.fret })} stringName={stringName} onNotePress={(n) => playEvent({ notes: [{ ...n, pitch: tuning[n.string] + n.fret }] })} />
      {has('key') && !has('progression') ? <DiatonicStrip keyName={s.key} scaleId={has('scale7') ? s.scale7 : s.scale} sevenths={sevenths} onSeventhsChange={setSevenths} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  keys: { justifyContent: 'space-between' },
  error: { color: colors.danger, fontSize: text.sm, paddingHorizontal: space[4] },
  buttons: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], flexWrap: 'wrap' },
  inline: { gap: space[2] },
  label: { color: colors.muted, fontSize: text.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: space[4] },
  stepper: { paddingHorizontal: space[4], alignItems: 'flex-start' },
  transport: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] },
  play: { flex: 1, minHeight: 52 },
  tab: { paddingHorizontal: space[4] },
})
