import { Pressable, StyleSheet, Text, View } from 'react-native'
import { PROGRESSIONS, randomProgression } from '@music/exercises.js'
import { BEAT_OPTIONS, moveItem, practiceColumns, removeItem, setItemBeats, type PracticeItem } from '@music/practiceTab.js'
import { TUNINGS } from '@music/theory.js'
import { colors, space, text, touch } from '@/theme'
import { impact } from '@/lib/haptics'
import { Menu, MoreMenu, type MenuItem } from './Menu'
import Tab from './Tab'
import { Button, Hint, PlatformSwitch, Section, Stepper } from './ui'

interface PracticeTabProps {
  items: PracticeItem[]
  onItemsChange: (items: PracticeItem[]) => void
  onStartFrom: (progression: string) => void
  mood: 'major' | 'minor'
  playing: boolean
  onTogglePlay: () => void
  active: number | null
  onSelectColumn: (index: number) => void
  bpm: number
  onBpmChange: (bpm: number) => void
  click: boolean
  onClickChange: (on: boolean) => void
  drone: boolean
  onDroneChange: (on: boolean) => void
  droneName: string
  tuningId: string
  tuningNames: string[]
}

/** The practice tab, as on the web (src/components/PracticeTab.jsx): everything pinned, played as one looping tab. */
export default function PracticeTab(props: PracticeTabProps) {
  const { items, onItemsChange, onStartFrom, mood, playing, onTogglePlay, active, onSelectColumn, bpm, onBpmChange, click, onClickChange, drone, onDroneChange, droneName, tuningId, tuningNames } = props
  const { columns, owner } = practiceColumns(items)
  const activeItem = active === null ? null : owner[active]
  const progressions: MenuItem[] = [
    { label: 'Common progressions', inline: true, items: PROGRESSIONS.map((p) => ({ label: `${p.name} · ${p.text}`, onPress: () => onStartFrom(p.text) })) },
    { label: 'Random progression', onPress: () => onStartFrom(randomProgression(mood, 4)) },
  ]

  return (
    <Section
      title="Practice tab"
      sub={items.length ? `${items.length} ${items.length === 1 ? 'item' : 'items'}, looped` : undefined}
      right={items.length ? <MoreMenu label="Practice tab actions" items={[{ label: 'Clear the practice tab', destructive: true, onPress: () => onItemsChange([]) }]} /> : undefined}
    >
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>Find a voicing or scale position on the neck and tap Pin. Pinned items play here one after another, on a loop.</Text>
          <Menu items={progressions} title="Start from a progression">
            <View style={styles.menuButton} accessible accessibilityRole="button" accessibilityLabel="Start from a progression">
              <Text style={styles.menuText}>Start from a progression…</Text>
            </View>
          </Menu>
        </View>
      ) : (
        <>
          <View style={styles.transport}>
            <Stepper label="BPM" value={bpm} onChange={onBpmChange} min={30} max={300} step={5} />
            <Button primary title={playing ? 'Stop' : 'Play'} onPress={onTogglePlay} style={styles.play} />
          </View>
          <View style={styles.switches}>
            <View style={styles.switch}>
              <Text style={styles.label}>Click</Text>
              <PlatformSwitch value={click} onChange={onClickChange} label="Click" />
            </View>
            <View style={styles.switch}>
              <Text style={styles.label}>Drone {droneName}</Text>
              <PlatformSwitch value={drone} onChange={onDroneChange} label={`Drone on ${droneName}`} />
            </View>
          </View>

          <View style={styles.list}>
            {items.map((item, i) => (
              <View key={item.id} style={[styles.item, activeItem === i && styles.itemOn]}>
                <Pressable style={styles.itemName} onPress={() => onSelectColumn(owner.indexOf(i))} accessibilityRole="button" accessibilityLabel={`Hear ${item.name}, ${item.detail}`}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.detail}>
                    {item.detail}
                    {item.tuningId !== tuningId ? ` · pinned in ${TUNINGS[item.tuningId]?.name ?? item.tuningId}` : ''}
                  </Text>
                </Pressable>
                <View style={styles.tools}>
                  {item.kind === 'chord' && (
                    <Menu items={BEAT_OPTIONS.map((b) => ({ label: `${b} ${b === 1 ? 'beat' : 'beats'}`, checked: b === item.beats, onPress: () => onItemsChange(setItemBeats(items, i, b)) }))} title={`How long ${item.name} rings`}>
                      <View style={styles.tool} accessible accessibilityRole="button" accessibilityLabel={`${item.beats} beats, change`}>
                        <Text style={styles.toolText}>{item.beats}♩</Text>
                      </View>
                    </Menu>
                  )}
                  <Menu
                    items={[
                      { label: 'Move earlier', disabled: i === 0, onPress: () => onItemsChange(moveItem(items, i, -1)) },
                      { label: 'Move later', disabled: i === items.length - 1, onPress: () => onItemsChange(moveItem(items, i, 1)) },
                      { label: 'Remove', destructive: true, onPress: () => onItemsChange(removeItem(items, i)) },
                    ]}
                    title={item.name}
                  >
                    <View style={styles.tool} accessible accessibilityRole="button" accessibilityLabel={`${item.name} actions`}>
                      <Text style={styles.toolText}>⋯</Text>
                    </View>
                  </Menu>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.tab}>
            <Tab
              columns={columns}
              tuningNames={tuningNames}
              columnWidth={44}
              active={active}
              onSelect={(i) => {
                impact()
                onSelectColumn(i)
              }}
            />
          </View>
          <View style={styles.foot}>
            <Menu items={progressions} title="Add a progression">
              <View style={styles.menuButton} accessible accessibilityRole="button" accessibilityLabel="Add a progression">
                <Text style={styles.menuText}>Add a progression…</Text>
              </View>
            </Menu>
          </View>
          <Hint>Tap an item or a tab column to hear it. ⋯ moves or removes it.</Hint>
        </>
      )}
    </Section>
  )
}

const styles = StyleSheet.create({
  empty: { gap: space[3], paddingHorizontal: space[4] },
  muted: { color: colors.muted, fontSize: text.base, lineHeight: 22 },
  menuButton: { alignSelf: 'flex-start', minHeight: touch, justifyContent: 'center', paddingHorizontal: space[4], borderRadius: 10, backgroundColor: colors.surface },
  menuText: { color: colors.accent, fontSize: text.base, fontWeight: '600' },
  transport: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] },
  play: { flex: 1 },
  switches: { flexDirection: 'row', gap: space[5], paddingHorizontal: space[4] },
  switch: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  label: { color: colors.text, fontSize: text.base },
  list: { gap: space[2], paddingHorizontal: space[4] },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[2], padding: space[2], borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  itemOn: { borderColor: colors.accent },
  itemName: { flex: 1, minHeight: touch, justifyContent: 'center' },
  name: { color: colors.text, fontSize: text.base, fontWeight: '700' },
  detail: { color: colors.muted, fontSize: text.sm },
  tools: { flexDirection: 'row', gap: space[1] },
  tool: { minWidth: touch, minHeight: touch, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.bg },
  toolText: { color: colors.text, fontSize: text.base, fontWeight: '600' },
  tab: { paddingHorizontal: space[4] },
  foot: { paddingHorizontal: space[4] },
})
