import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { audioContext } from '@music/audio.js'
import { CLICK_SOUNDS, SOUND_FAMILIES, previewSound } from '@music/clickSounds.js'
import { METRONOME_METERS, SUBDIVISIONS, clampBpm, nextAccent, subdivisionById, tapTempo, tempoName, type Accent } from '@music/rhythm.js'
import { startClickTrack, type ClickTrack, type ClickTrackSettings, type Pulse } from '@music/rhythmEngine.js'
import { ACCENT_NAMES, metronomeStatus, type MetronomeSettings } from '@music/rhythmView.js'
import { impact, selection } from '@/lib/haptics'
import { colors, space, text, touch } from '@/theme'
import { Button, ChipRow, ChoiceRow, Disclosure, Group, Hint, Notice, SliderRow, Stepper, SwitchRow, TempoSlider } from '../ui'

export const RHYTHM_SHEET = '/rhythm/choose'
const percent = (v: number) => `${Math.round(v * 100)}%`
const SOUND_SECTIONS = SOUND_FAMILIES.map((family) => ({ title: family, options: CLICK_SOUNDS.filter((s) => s.family === family).map((s) => ({ value: s.id, label: s.name })) }))
const SUB_CHIPS = SUBDIVISIONS.map((s) => ({ value: s.id, label: s.name, sub: s.short }))
const METER_OPTIONS = [{ options: METRONOME_METERS.map((m) => ({ value: m, label: m })) }]

/** A change to the saved metronome settings (accents null = back to the meter's defaults). */
export type MetronomePatch = Partial<Omit<MetronomeSettings, 'accents'>> & { accents?: Accent[] | null }

export interface MetronomeProps {
  settings: MetronomeSettings
  update: (patch: MetronomePatch) => void
  sound: string
  onSoundChange: (id: string) => void
}

/** Starts a click track while `playing`, keeping it on the latest settings without restarting the beat. */
export function useClickTrack(playing: boolean, settings: ClickTrackSettings, callbacks: Parameters<typeof startClickTrack>[1]) {
  const engine = useRef<ClickTrack | null>(null)
  const latest = useRef(settings)
  const handlers = useRef(callbacks)
  useEffect(() => {
    latest.current = settings
    handlers.current = callbacks
    engine.current?.update(settings)
  })
  useEffect(() => {
    if (!playing) return
    engine.current = startClickTrack(latest.current, {
      onPulse: (p) => handlers.current?.onPulse?.(p),
      onTempo: (bpm) => handlers.current?.onTempo?.(bpm),
      onBeatScheduled: (time, at) => handlers.current?.onBeatScheduled?.(time, at),
    })
    return () => {
      engine.current?.stop()
      engine.current = null
    }
  }, [playing])
}

/** Gap-click and speed trainers (shared by the metronome and nothing else on phones). */
function Trainers({ settings, update }: Pick<MetronomeProps, 'settings' | 'update'>) {
  const { gap, speed } = settings
  return (
    <>
      <Group>
        <SwitchRow label="Gap click" value={gap.on} onChange={(on) => update({ gap: { ...gap, on } })} first last={!gap.on} />
        {gap.on ? (
          <View style={[styles.trainerRow, styles.lastRow]}>
            <Stepper label="CLICK BARS" value={gap.play} onChange={(v) => update({ gap: { ...gap, play: v } })} min={1} max={16} />
            <Stepper label="SILENT BARS" value={gap.mute} onChange={(v) => update({ gap: { ...gap, mute: v } })} min={1} max={16} />
          </View>
        ) : null}
      </Group>
      <Hint>The click drops out so you keep the time yourself.</Hint>
      <Group>
        <SwitchRow label="Speed trainer" value={speed.on} onChange={(on) => update({ speed: { ...speed, on } })} first last={!speed.on} />
        {speed.on ? (
          <View style={[styles.trainerRow, styles.lastRow]}>
            <Stepper label="ADD BPM" value={speed.step} onChange={(v) => update({ speed: { ...speed, step: v } })} min={1} max={20} />
            <Stepper label="EVERY BARS" value={speed.every} onChange={(v) => update({ speed: { ...speed, every: v } })} min={1} max={32} />
            <Stepper label="STOP AT" value={speed.max} onChange={(v) => update({ speed: { ...speed, max: v } })} min={30} max={300} step={5} />
          </View>
        ) : null}
      </Group>
      <Hint>Starts at your tempo and climbs a little at a time.</Hint>
    </>
  )
}

/** A metronome built for practice: big tempo, beat lights you tap to accent or mute, subdivisions, sounds and trainers. */
export default function Metronome({ settings, update, sound, onSoundChange }: MetronomeProps) {
  const [playing, setPlaying] = useState(false)
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [liveBpm, setLiveBpm] = useState<number | null>(null)
  const taps = useRef<number[]>([])
  const { accents } = settings
  const bpm = clampBpm(settings.bpm)
  const sub = subdivisionById(settings.subdivision)

  useClickTrack(playing, { ...settings, bpm, sound }, { onPulse: setPulse, onTempo: setLiveBpm })
  const toggle = () => {
    setPulse(null)
    setLiveBpm(null)
    setPlaying(!playing)
  }

  const setBpm = (v: number) => update({ bpm: clampBpm(v) })
  const nudge = (d: number) => {
    selection()
    setBpm(bpm + d)
  }
  const tap = () => {
    impact()
    const ac = audioContext()
    const now = ac ? ac.currentTime : performance.now() / 1000
    taps.current = [...taps.current.filter((t) => now - t < 4), now]
    const found = tapTempo(taps.current)
    if (found) setBpm(found)
  }
  const cycleAccent = (i: number) => {
    selection()
    update({ accents: accents.map((a, k) => (k === i ? nextAccent(a) : a)) })
  }

  const shown = liveBpm ?? bpm
  const status = metronomeStatus(pulse, settings)

  return (
    <View style={styles.wrap}>
      <View style={styles.tempo}>
        <Pressable onPress={() => nudge(-1)} style={({ pressed }) => [styles.nudge, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Slower by 1 BPM">
          <Text style={styles.nudgeText}>−</Text>
        </Pressable>
        <View style={styles.readout} accessible accessibilityRole="adjustable" accessibilityLabel={`Tempo ${shown} BPM, ${tempoName(shown)}`}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
          <Text style={styles.bpm}>{shown}</Text>
          <Text style={styles.unit}>BPM{settings.meter.endsWith('/8') ? ' (8ths)' : ''}</Text>
          <Text style={styles.tempoName}>{tempoName(shown)}</Text>
        </View>
        <Pressable onPress={() => nudge(1)} style={({ pressed }) => [styles.nudge, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Faster by 1 BPM">
          <Text style={styles.nudgeText}>+</Text>
        </Pressable>
      </View>
      <TempoSlider value={bpm} onChange={(v) => update({ bpm: Math.round(v) })} />
      <View style={styles.quick}>
        {[-10, -5].map((d) => (
          <Button key={d} title={String(d)} onPress={() => nudge(d)} style={styles.quickButton} />
        ))}
        <Button title="Tap tempo" onPress={tap} style={styles.tapButton} />
        {[5, 10].map((d) => (
          <Button key={d} title={`+${d}`} onPress={() => nudge(d)} style={styles.quickButton} />
        ))}
      </View>

      <View style={styles.lights}>
        {accents.map((level, i) => {
          const lit = pulse !== null && pulse.beat === i
          return (
            <Pressable
              key={i}
              onPress={() => cycleAccent(i)}
              accessibilityRole="button"
              accessibilityLabel={`Beat ${i + 1}: ${ACCENT_NAMES[level]}. Tap to change.`}
              style={[styles.light, level === 'accent' && styles.lightAccent, level === 'mute' && styles.lightMute, lit && pulse.sub === 0 && (pulse.audible ? styles.lightOn : styles.lightGhost)]}
            >
              <Text style={[styles.lightText, lit && pulse.sub === 0 && pulse.audible && styles.lightTextOn]}>{i + 1}</Text>
              {sub.offsets.length > 1 ? (
                <View style={styles.subs}>
                  {sub.offsets.slice(1).map((_, k) => (
                    <View key={k} style={[styles.subDot, lit && pulse.sub === k + 1 && styles.subDotOn]} />
                  ))}
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </View>
      <Hint>Tap a beat to accent it, make it normal, or silence it (try silencing 1 and 3 to hear only the backbeat).</Hint>

      <View style={styles.transport}>
        <Button primary title={playing ? 'Stop' : 'Start'} onPress={toggle} style={styles.play} />
      </View>
      {status ? <Notice>{status}</Notice> : null}

      <Group>
        <ChoiceRow label="Time signature" value={settings.meter} sections={METER_OPTIONS} onChange={(meter) => update({ meter, accents: null })} sheet={RHYTHM_SHEET} first />
        <SwitchRow label="Count-in bar" value={settings.countIn} onChange={(countIn) => update({ countIn })} last />
      </Group>

      <View style={styles.section}>
        <Text style={styles.label}>Subdivision</Text>
        <ChipRow label="Subdivision" options={SUB_CHIPS} value={sub.id} onChange={(subdivision) => update({ subdivision })} />
      </View>

      <Disclosure title="Sound & volume" summary={CLICK_SOUNDS.find((s) => s.id === sound)?.name}>
        <Group>
          <ChoiceRow
            label="Sound"
            value={sound}
            sections={SOUND_SECTIONS}
            onChange={(id) => {
              onSoundChange(id)
              previewSound(id, settings.volume)
            }}
            sheet={RHYTHM_SHEET}
            first
          />
          <SliderRow label="Click volume" value={settings.volume} onChange={(volume) => update({ volume })} min={0.1} max={1} step={0.05} format={percent} />
          <SliderRow label="Subdivisions" value={settings.subVolume} onChange={(subVolume) => update({ subVolume })} min={0} max={1} step={0.05} format={percent} disabled={sub.offsets.length === 1} last />
        </Group>
      </Disclosure>

      <Disclosure title="Trainers" summary={[settings.gap.on && 'Gap click', settings.speed.on && 'Speed trainer'].filter(Boolean).join(' · ') || 'Off'}>
        <Trainers settings={settings} update={update} />
      </Disclosure>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  tempo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[4], paddingHorizontal: space[4] },
  nudge: { width: touch + 12, height: touch + 12, borderRadius: (touch + 12) / 2, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  nudgeText: { color: colors.text, fontSize: 28, fontWeight: '500' },
  pressed: { opacity: 0.6 },
  readout: { alignItems: 'center', minWidth: 140 },
  bpm: { color: colors.text, fontSize: 72, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 80 },
  unit: { color: colors.muted, fontSize: text.sm, fontWeight: '600', letterSpacing: 1 },
  tempoName: { color: colors.accent, fontSize: text.base, fontStyle: 'italic' },
  quick: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4] },
  quickButton: { flex: 1, paddingHorizontal: 0 },
  tapButton: { flex: 2 },
  lights: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[2], paddingHorizontal: space[4] },
  light: { width: 58, height: 70, borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 6 },
  lightAccent: { borderColor: colors.accent },
  lightMute: { opacity: 0.4, borderStyle: 'dashed' },
  lightOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  lightGhost: { borderColor: colors.text },
  lightText: { color: colors.text, fontSize: text.lg, fontWeight: '700' },
  lightTextOn: { color: colors.onAccent },
  subs: { flexDirection: 'row', gap: 3 },
  subDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  subDotOn: { backgroundColor: colors.text },
  transport: { paddingHorizontal: space[4] },
  play: { minHeight: 56 },
  section: { gap: space[2] },
  label: { color: colors.muted, fontSize: text.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: space[4] },
  trainerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], padding: space[3], marginHorizontal: space[4], backgroundColor: colors.surface },
  lastRow: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
})
