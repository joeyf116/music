// Types for the music code shared with the web site (../src/lib, plain JavaScript). The app imports it through the
// `@music/*` alias; these declarations are the typed contract between the two, so the app is checked strictly while
// the web code stays as it is. Keep them in step when a shared function's inputs or outputs change.

declare module '@music/theory.js' {
  export type NoteRole = 'root' | 'third' | 'fifth' | 'seventh' | 'other'
  export interface Scale {
    name: string
    intervals: number[]
  }
  export interface ChordType {
    name: string
    symbol: string
    intervals: number[]
  }
  export interface Tuning {
    name: string
    group: string
    flats?: boolean
    pitches: number[]
  }
  /** A chord built on one degree of a key (I, ii, ♭VII…). */
  export interface DiatonicChord {
    degree: number
    numeral: string
    type: string
    rootName: string
    rootPc: number
    name: string
    intervals: number[]
  }

  export const KEYS: string[]
  export const NUM_FRETS: number
  export function mod12(n: number): number
  export function noteToPc(name: string): number
  export function intervalName(semitones: number, intervals?: number[]): string
  export const TUNING_GROUPS: string[]
  export const TUNINGS: Record<string, Tuning>
  export const SCALES: Record<string, Scale>
  export const CHORDS: Record<string, ChordType>
  export function sevenNoteScale(id: string): string
  export function usesFlats(key: string): boolean
  export function pcName(pc: number, flats?: boolean): string
  export function tuningNotes(tuning: Tuning): string
  export function degreeRole(name: string): NoteRole
  export function noteRole(semitones: number | undefined, intervals?: number[]): NoteRole
  export function diatonicChords(key: string, scaleId: string, sevenths?: boolean): DiatonicChord[]
}

declare module '@music/exercises.js' {
  import type { Position } from '@music/fretboardView.js'

  export interface ProgressionPreset {
    name: string
    text: string
  }
  export interface Meter {
    id: string
    beats: number
    unit: number
    groups: number[]
    beatTicks: number
    barTicks: number
  }
  /** A note in a score: where it's played, its pitch, and (for drills) its degree and spelling. */
  export interface ScoreNote extends Position {
    pitch: number
    degree?: string
    name?: string
    muted?: boolean
  }
  /** One moment in a score: the notes struck together and how to show them. */
  export interface ScoreEvent {
    notes: ScoreNote[]
    tick: number
    ring: number
    barStart: boolean
    count: string
    heading?: string
    label?: string
    strum?: 'down' | 'up'
    muted?: boolean
    shape?: ScoreNote[]
  }
  export interface Score {
    meter: Meter
    events: ScoreEvent[]
    totalTicks: number
    bars: number
  }
  export interface Exercise {
    id: string
    group: string
    name: string
    controls: string[]
    about: string
  }
  export type ExerciseSettings = Record<string, string | number | boolean>
  export interface ExerciseScore extends Score {
    exercise: Exercise
    settings: ExerciseSettings & { key: string; scale: string; scale7: string; position: number; layout: string; progression: string }
    errors: string[]
  }

  export const PROGRESSIONS: ProgressionPreset[]
  export const NECK_AREAS: Record<string, { name: string; fret: number }>
  export const EXERCISES: Exercise[]
  export const DEFAULT_SETTINGS: ExerciseSettings
  export function randomProgression(mode?: 'major' | 'minor', length?: number, random?: () => number): string
  export function buildExercise(settings: ExerciseSettings, tuning: number[]): ExerciseScore
}

declare module '@music/exerciseView.js' {
  import type { ExerciseScore, ScoreNote } from '@music/exercises.js'
  import type { Column, Level } from '@music/fretboardView.js'

  export type FieldValue = string | number | boolean
  export interface FieldOption {
    value: FieldValue
    label: string
    title?: string
    disabled?: boolean
  }
  /** One exercise setting: a list to pick from, a few buttons, or a number. */
  export interface ExerciseField {
    id: string
    label: string
    kind: 'select' | 'choice' | 'stepper'
    value: FieldValue
    options?: FieldOption[]
    min?: number
    max?: number
    fallback?: number
    resetsPosition?: boolean
  }
  export const EXERCISE_GROUPS: string[]
  export const SPEED_UPS: number[]
  export function exerciseMenu(): { group: string; options: { value: string; label: string }[] }[]
  export function exerciseFields(score: ExerciseScore, tuning: number[], stringName: (string: number) => string): ExerciseField[]
  export function exerciseLayoutField(score: ExerciseScore): ExerciseField | null
  export function exercisePositions(score: ExerciseScore, tuning: number[]): { label: string; hint: string }[]
  export function exerciseTitle(score: ExerciseScore): string
  export function isMelodic(score: ExerciseScore): boolean
  export function exerciseColumns(score: ExerciseScore, labels: 'notes' | 'degrees'): Column[]
  export function exerciseColumnWidth(score: ExerciseScore): number
  export function exerciseNeckNotes(score: ExerciseScore, activeIndex: number | null): (ScoreNote & { level: Level })[]
  export function exerciseNeckLabel(score: ExerciseScore, labels: 'notes' | 'degrees', note: ScoreNote): string
}

declare module '@music/audio.js' {
  /** The app's one audio context (null where audio isn't available). */
  export function audioContext(): { currentTime: number } | null
  /** Starts a soft drone on a pitch; returns a function that fades it out. */
  export function startDrone(pitch: number): () => void
  /** Plays one MIDI pitch; returns a function that cuts it short. */
  export function playPitch(pitch: number, delay?: number, duration?: number, volume?: number): () => void
  /** Strums several MIDI pitches, low to high. */
  export function playChord(pitches: number[], delay?: number): void
}

declare module '@music/fretboardView.js' {
  import type { ChordType, DiatonicChord } from '@music/theory.js'

  export type View = 'scale' | 'chord' | 'inversion' | 'progression'
  export type Level = 'faint' | 'path' | 'shape' | 'active'
  export interface Option<V extends string = string> {
    value: V
    label: string
    title?: string
  }
  export interface Position {
    string: number
    fret: number
    interval?: number
  }
  /** A note drawn on the neck. Progression notes carry their own degree name and spelling instead of an interval. */
  export interface NeckNote extends Position {
    level: Level
    degree?: string
    name?: string
    role?: string
  }
  export interface ParsedChord extends Omit<DiatonicChord, 'degree' | 'numeral'> {
    numeral?: string
  }
  /** One column of tab: the notes played together, with optional labels and a bar line before it. */
  export interface Column {
    notes: Position[]
    label?: string
    sublabel?: string
    heading?: string
    groupStart?: boolean
    shape?: Position[]
    chord?: ParsedChord
  }
  export interface Shapes {
    options: { label: string; hint: string }[]
    optionIndex?: number
    path: Position[]
    columns: Column[]
    columnWidth: number
    defaultActive: number | null
    shape?: Position[] | null
    all?: boolean
  }
  export interface Settings {
    view: string
    keyName: string
    scaleType: string
    chordDegree: number
    chordOverride: string
    sevenths: boolean
    drop: string
    layout: string
    position: number | 'all'
    stringSet: number
    progression: string
    area: string
    tuning: number[]
    tuningId: string
  }
  export interface Model {
    view: View
    keyPc: number
    modeId: string
    picked: DiatonicChord
    overrideOk: boolean
    chordType: string
    chordName: string
    isFourNote: boolean
    badTokens: string[]
    goodChords: { token: string; chord: ParsedChord }[]
    formula: { rootPc: number; intervals: number[]; names: string[]; rootName: string }
    rootPc: number
    intervals: number[]
    shapes: Shapes
    selection: string
    heading: { title: string; sub: string }
    tabNote: string
    drill: { name: string; settings: Record<string, unknown> }
    typeOptions: [string, ChordType][]
  }
  export interface Active {
    selection: string
    index: number
  }
  export interface Chip {
    key: number
    name: string
    sub: string
    root: boolean
    on?: boolean
    index?: number
  }

  export const VIEWS: Option<View>[]
  export const VIEW_IDS: View[]
  export const LABEL_OPTIONS: Option<'notes' | 'intervals'>[]
  export const LAYOUT_OPTIONS: Option[]
  export const DROP_OPTIONS: Option[]
  export const AREA_OPTIONS: Option[]
  export const LEGEND: [string, string][]
  export const ALL_POSITIONS: 'all'
  export const INVERSION_TYPES: string[]
  export function progressionToken(chord: DiatonicChord): string
  export function progressionMood(scaleType: string): 'major' | 'minor'
  export function fretboardView(settings: Settings): Model
  export function activeColumnIndex(model: Model, active: Active | null): number | null
  export function noteLabeller(model: Model, labels: string, tuning: number[]): (note: NeckNote | Position) => string
  export function neckNotes(model: Model, activeIndex: number | null, showAll: boolean, tuning: number[]): NeckNote[]
  export function headingChips(model: Model, activeIndex: number | null): Chip[]
  export function columnDuration(view: View, bpm: number): number
  export function columnPitches(column: Column, tuning: number[]): number[]
  export function tabStringNames(tuning: number[], stringName: (string: number) => string): string[]
}

declare module '@music/clickSounds.js' {
  export type ClickLevel = 'accent' | 'beat' | 'sub' | 'mute'
  export interface ClickSound {
    id: string
    name: string
    family: string
  }
  export const CLICK_SOUNDS: ClickSound[]
  export const SOUND_FAMILIES: string[]
  export const DEFAULT_SOUND: string
  export const SOUND_KEY: string
  export function soundById(id: string): ClickSound
  export function previewSound(id: string, volume?: number): void
}

declare module '@music/rhythm.js' {
  import type { Score } from '@music/exercises.js'

  export type Accent = 'accent' | 'beat' | 'mute'
  export interface Subdivision {
    id: string
    name: string
    short: string
    offsets: number[]
    counts: string[]
  }
  export interface Gap {
    on: boolean
    play?: number
    mute?: number
  }
  export interface Speed {
    on: boolean
    step?: number
    every?: number
    max?: number
  }
  export interface Grade {
    id: 'perfect' | 'good' | 'off'
    limit: number
    label: string
  }
  export interface TapResult {
    target: number
    ms: number
    grade: Grade['id']
    label: string
  }
  export interface TapSummary {
    count: number
    mean: number
    spread: number
    tight: number
    verdict: string
  }
  export interface RhythmLevel {
    id: number
    name: string
    about: string
  }
  export interface RhythmPreset {
    id: string
    level: number
    name: string
    beats: string
  }
  export interface RhythmCell {
    beat: number
    cell: number
    cells: number
    tick: number
    hit: boolean
    count: string
    strum: 'down' | 'up' | null
  }
  export const METRONOME_METERS: string[]
  export const SUBDIVISIONS: Subdivision[]
  export const RHYTHM_LEVELS: RhythmLevel[]
  export const RHYTHMS: RhythmPreset[]
  export const PLAY_ON: { value: string; label: string; title: string }[]
  export function subdivisionById(id: string): Subdivision
  export function fitAccents(accents: unknown, meterId: string): Accent[]
  export function nextAccent(level: Accent): Accent
  export function clampBpm(bpm: unknown, min?: number, max?: number): number
  export function tapTempo(times: number[]): number | null
  export function tempoName(bpm: number): string
  export function judgeTap(tap: number, targets: number[], window?: number): TapResult | null
  export function summarizeTaps(offsets: number[]): TapSummary | null
  export function rhythmById(id: string): RhythmPreset | undefined
  export function parseBeats(beats: string): string[]
  export function rhythmCells(beats: string): RhythmCell[]
  export function toggleCell(beats: string, beat: number, cell: number): string
  export function regridBeat(beats: string, beat: number, size: number): string
  export function rhythmScore(beats: string, options: { bars?: number; tuning: number[]; playOn?: string; rootPc?: number; minor?: boolean }): Score & { events: (Score['events'][number] & { count: string })[] }
}

declare module '@music/rhythmView.js' {
  import type { Accent, Gap, Speed } from '@music/rhythm.js'
  import type { Pulse } from '@music/rhythmEngine.js'

  export interface MetronomeSettings {
    bpm: number
    meter: string
    accents: Accent[]
    subdivision: string
    volume: number
    subVolume: number
    countIn: boolean
    gap: Required<Gap>
    speed: Required<Speed>
    tapCorrection: number
  }
  export interface RhythmDrill {
    level: number
    rhythm: string
    beats: string
    playOn: string
    mode: 'listen' | 'along'
    countIn: boolean
    clickGrid: boolean
    showTab: boolean
  }
  export type RhythmTab = 'metronome' | 'rhythms' | 'timing' | 'drills'
  export type ClickMode = 'full' | 'one' | 'backbeat' | 'gap'

  export const RHYTHM_TAB_KEY: string
  export const RHYTHM_TABS: { id: RhythmTab; label: string }[]
  export const RHYTHM_ABOUT: Partial<Record<RhythmTab, string>>
  export const METRONOME_KEY: string
  export const DEFAULT_METRONOME: Omit<MetronomeSettings, 'accents'> & { accents: Accent[] | null }
  export const ACCENT_NAMES: Record<Accent, string>
  export const CLICK_MODES: { value: ClickMode; label: string; title: string }[]
  export const RHYTHM_DRILL_KEY: string
  export const RHYTHM_DRILL_DEFAULTS: RhythmDrill
  export const DRILL_MODES: { value: RhythmDrill['mode']; label: string; title: string }[]
  export const BEAT_GRIDS: { value: number; label: string }[]
  export const RHYTHM_STEPS: [string, string][]
  export function metronomeSettings(stored: unknown): MetronomeSettings
  export function metronomeStatus(pulse: Pulse | null, settings: MetronomeSettings): string
  export function clickModeAccents(mode: ClickMode, accents: Accent[]): Accent[]
  export function clickModeGap(mode: ClickMode): Gap
  export function timingStatus(pulse: Pulse | null, gap: Gap): string
  export function tapVerdict(last: { miss?: boolean; label?: string; grade?: string; ms?: number } | null, idle: string): string
  export function tapPosition(ms: number): number
  export function rhythmColumnWidth(finest: number): number
}

declare module '@music/rhythmEngine.js' {
  import type { Accent, Gap, Speed } from '@music/rhythm.js'

  export interface Pulse {
    bar: number
    beat: number
    sub: number
    level: Accent | 'sub'
    audible: boolean
  }
  export interface ClickTrackSettings {
    bpm: number
    accents: Accent[]
    subdivision: string
    sound: string
    volume: number
    subVolume: number
    gap: Gap
    speed: Speed
    countIn: boolean
  }
  export interface ClickTrack {
    stop: () => void
    update: (settings: ClickTrackSettings) => void
  }
  /** Audio-clock time that is reaching the listener right now. */
  export function heardNow(ac: { currentTime: number }): number
  export function startClickTrack(
    settings: ClickTrackSettings,
    callbacks?: { onPulse?: (pulse: Pulse) => void; onTempo?: (bpm: number) => void; onBeatScheduled?: (time: number, at: { bar: number; beat: number }) => void },
  ): ClickTrack
}

declare module '@music/player.js' {
  import type { Score, ScoreEvent } from '@music/exercises.js'

  export interface PlaybackOptions {
    bpm: number
    loop?: boolean
    countIn?: boolean
    click?: boolean
    subdivision?: number[]
    clickVolume?: number
    silent?: boolean
    speedUp?: number
    maxBpm?: number
    onStep?: (index: number, count?: number) => void
    onBpm?: (bpm: number) => void
    onEnd?: () => void
    onHit?: (time: number) => void
  }
  export function playEvent(event: Pick<ScoreEvent, 'notes'> & Partial<ScoreEvent>, delay?: number, ring?: number): (() => void)[]
  export function startPlayback(score: Score, options: PlaybackOptions): () => void
}

declare module '@music/chordQuiz.js' {
  export interface Quality {
    id: string
    short: string
    name: string
    symbol: string
    feel: string
    listen: string
    intervals: number[]
  }
  export interface ChordQuestion {
    quality: string
    rootPc: number
    inversion: number
  }
  export interface Stat {
    right: number
    tries: number
  }
  export interface ChordGame {
    question: ChordQuestion | null
    guesses: string[]
    revealed: boolean
    score: Stat
    stats: Record<string, Stat>
  }
  export type ChordGameAction = { type: 'guess'; quality: string } | { type: 'reveal' } | { type: 'next'; question: ChordQuestion | null } | { type: 'resetStats' }
  export type RoundState = 'empty' | 'asking' | 'solved' | 'revealed'
  export interface Option<V extends string = string> {
    value: V
    label: string
    title?: string
  }

  export const QUALITIES: Quality[]
  export const CHORD_PRESETS: { id: string; label: string; qualities: string[] }[]
  export const PLAY_STYLES: Option<'both' | 'arpeggio' | 'block'>[]
  export const VOICINGS: Option<'close' | 'guitar'>[]
  export const ROOT_MODES: Option<'fixed' | 'random'>[]
  export function qualityInfo(id: string): Quality
  export function randomChordQuestion(qualities: string[], options?: { rootMode?: string; keyPc?: number; inversions?: boolean; previous?: ChordQuestion | null }): ChordQuestion
  export function guitarShape(rootPc: number, qualityId: string, tuning: number[]): { string: number; fret: number; pitch: number; interval: number }[]
  export function chordPitches(question: ChordQuestion, options?: { voicing?: string; tuning?: number[]; quality?: string }): number[]
  export function chordRoundState(game: ChordGame): RoundState
  export function initialChordGame(question: ChordQuestion | null, stats?: Record<string, Stat>): ChordGame
  export function chordGameReducer(game: ChordGame, action: ChordGameAction): ChordGame
  export function chordQuizText(game: ChordGame, rootName: string): { feedback: string; compare: string }
  export function chordPresetName(ids: string[]): string | undefined
  export function toggleQuality(enabled: string[], id: string): string[] | null
}

declare module '@music/intervalQuiz.js' {
  import type { Position } from '@music/fretboardView.js'
  import type { RoundState, Stat } from '@music/chordQuiz.js'

  export type Direction = 'up' | 'down' | 'together' | 'mixed'
  export interface IntervalInfo {
    semitones: number
    short: string
    name: string
    song: string
  }
  export interface IntervalQuestion {
    root: Position
    target: Position
    semitones: number
    direction: Exclude<Direction, 'mixed'>
  }
  export interface IntervalGame {
    question: IntervalQuestion | null
    guesses: number[]
    revealed: boolean
    score: Stat
    streak: number
    best: number
    stats: Record<string, Stat>
  }
  export type IntervalGameAction = { type: 'guess'; size: number } | { type: 'reveal' } | { type: 'next'; question: IntervalQuestion | null } | { type: 'resetStats' }

  export const INTERVALS: IntervalInfo[]
  export const PRESETS: { id: string; label: string; semitones: number[] }[]
  export const DIRECTIONS: { id: Direction; label: string }[]
  export const FRET_RANGES: { maxFret: number; label: string }[]
  export const DIRECTION_TEXT: Record<Exclude<Direction, 'mixed'>, string>
  export function intervalInfo(semitones: number): IntervalInfo
  export function randomQuestion(tuning: number[], maxFret: number, semitones: number[], direction: Direction, random?: () => number, previous?: IntervalQuestion | null): IntervalQuestion | null
  export function pitchesOf(question: IntervalQuestion, tuning: number[]): [number, number]
  export function answerLabel(question: IntervalQuestion): string
  export function roundState(game: IntervalGame): RoundState
  export function initialGame(question: IntervalQuestion | null, saved?: { stats?: Record<string, Stat>; best?: number }): IntervalGame
  export function gameReducer(game: IntervalGame, action: IntervalGameAction): IntervalGame
  export function stringOrdinal(string: number, count: number): string
  export function intervalWithArticle(name: string): string
  export function intervalQuizText(game: IntervalGame): { feedback: string; compare: string }
  export function intervalPresetName(semitones: number[]): string | undefined
  export function toggleInterval(enabled: number[], size: number): number[] | null
}

declare module '@music/theoryDrill.js' {
  import type { DiatonicChord } from '@music/theory.js'

  export interface DrillOption {
    id: string | number
    label: string
    sub?: string
  }
  export interface DrillStep {
    kind: 'notes' | 'choice'
    prompt?: string
    options: DrillOption[]
    answers: (string | number)[]
  }
  export interface KeyInfo {
    root: string
    scaleId: string
    title: string
    scale: string[]
    chords: DiatonicChord[]
    sevenths: boolean
    parent: string | null
    modeIndex: number
  }
  export interface DrillChord {
    type: string
    rootName: string
    rootPc: number
    name: string
    notes: string[]
    intervals: number[]
  }
  export interface DrillQuestion {
    drill: 'build' | 'name' | 'spell'
    key?: KeyInfo
    degree: number
    chord: DrillChord
    prompt: string
    steps: DrillStep[]
  }
  export interface DrillGame {
    question: DrillQuestion
    step: number
    progress: number
    wrong: (string | number)[]
    missed: boolean
    revealed: boolean
    score: { right: number; tries: number }
  }
  export type DrillAction = { type: 'guess'; id: string | number } | { type: 'reveal' } | { type: 'next'; question: DrillQuestion }
  export interface DrillSettings {
    drill: string
    size: string
    keys: string
    keyMode: string
    keyName: string
  }
  export interface Option<V extends string = string> {
    value: V
    label: string
    title?: string
  }
  export type TrainingTab = 'chords' | 'intervals' | 'theory'

  export const DRILLS: Option<'build' | 'name' | 'spell' | 'mix'>[]
  export const CHORD_SIZES: Option<'triads' | 'sevenths' | 'both'>[]
  export const KEY_SETS: Option<'major' | 'minor' | 'both' | 'modes'>[]
  export const KEY_MODES: Option<'any' | 'fixed'>[]
  export const THEORY_RECIPE: [string, string][]
  export const TRAINING_TABS: { id: TrainingTab; label: string; hint: string }[]
  export const TRAINING_TIPS: { theory: string; ear: string }
  export function chordFormula(type: string): string[]
  export function toneName(index: number): string
  export function randomDrillQuestion(settings: DrillSettings, options?: { previous?: DrillQuestion | null }): DrillQuestion
  export function drillState(game: DrillGame): 'empty' | 'asking' | 'solved' | 'revealed'
  export function initialDrill(question: DrillQuestion): DrillGame
  export function pickedIn(game: DrillGame, index: number): (string | number)[]
  export function drillReducer(game: DrillGame, action: DrillAction): DrillGame
  export function drillChordPitches(chord: { rootPc: number; intervals: number[] }): number[]
  export function drillFeedback(game: DrillGame): string
  export function chordWorkingText(chord: DrillChord): string
  export function keyPatternText(question: DrillQuestion): { stack: string; pattern: string } | null
}

declare module '@music/chart.js' {
  export interface ChartSection {
    label: string
    bars: string[]
  }
  export interface Chart {
    title: string
    composer: string
    style: string
    key: string
    time: string
    tempo: number
    sections: ChartSection[]
  }
  export interface ParsedChartChord {
    root: number
    quality: string
    intervals: number[]
    bass: number | null
  }
  export interface Song {
    beats: number
    bars: { section: number; bar: number; events: { beat: number; beats: number; chord: ParsedChartChord | null; symbol?: string }[] }[]
  }
  export const TIME_SIGNATURES: string[]
  export const CHART_LIMITS: { title: number; composer: number; label: number; bar: number; sections: number; barsPerSection: number; totalBars: number }
  export const ALL_KEYS: string[]
  export function badTokens(text: string): string[]
  export function isMinorKey(key: string): boolean
  export function transposeKey(key: string, semitones: number): string
  export function keyDistance(from: string, to: string): number
  export function chordParts(symbol: string): { root: string; quality: string; bass: string }
  export function transposeChart<C extends Chart>(chart: C, toKey: string): C
  export function compileChart(chart: Chart): Song
  export function blankChart(): Chart
  export function validateChart(draft: Chart, styles: Record<string, unknown>): { chart: Chart; error?: undefined } | { error: string; chart?: undefined }
}

declare module '@music/chartView.js' {
  import type { Chart } from '@music/chart.js'

  export type ChartSource = 'library' | 'shared' | 'local'
  /** A chart in the catalog, with where it came from. */
  export interface CatalogChart extends Chart {
    id: string
    source: ChartSource
    collection: string
    mine?: boolean
    sharedId?: string
  }
  export interface SharedChartRow extends Chart {
    id: string
    collection: string
  }
  export interface LocalChart extends Chart {
    id: string
  }
  export type BarToken = { kind: 'chord'; root: string; quality: string; bass: string } | { kind: 'slash' } | { kind: 'nc' } | { kind: 'repeat' }
  export type Channel = 'drums' | 'bass' | 'piano'

  export const ALL_SHELF: string
  export const SHARED_SHELF: string
  export const MINE_SHELF: string
  export const SHARE_COOLDOWN_MS: number
  export const BUILT_IN_CHARTS: CatalogChart[]
  export const BARS_PER_ROW: number
  export const CHANNEL_LABELS: Record<Channel, string>
  export const DEFAULT_MIX: Record<Channel, number>
  export const CHART_HELP: string[]
  export function barCount(chart: Chart): number
  export function keyLabel(key: string): string
  export function editableChart(chart: Chart): Chart
  export function chartSummary(chart: Chart): string
  export function catalogCharts(shared: SharedChartRow[], local: LocalChart[], mine: Record<string, string>): CatalogChart[]
  export function chartShelves(shared: SharedChartRow[], local: LocalChart[], mine: Record<string, string>): string[]
  export function filterCharts(all: CatalogChart[], filters: { collection?: string; style?: string; query?: string }): CatalogChart[]
  export function chartCountText(shown: number, total: number): string
  export function barTokens(text: string): BarToken[]
  export function sectionStarts(chart: Chart): number[]
  export function transposeText(shift: number, fromKey: string): string
  export function bandStatus(state: { count: number | null; activeBar: number | null; startBar: number; totalBars: number }): string
  export function nextSection(sections: { label: string }[]): { label: string; bars: string[] }
  export function spreadBars(bars: string[], b: number, value: string): string[]
  export function moveSection<T>(sections: T[], s: number, by: number): T[]
}

declare module '@music/arranger.js' {
  export const STYLES: Record<string, { name: string; tempo: number }>
  export const STYLE_IDS: string[]
}

declare module '@music/band.js' {
  import type { Song } from '@music/chart.js'
  import type { Channel } from '@music/chartView.js'

  export interface Band {
    stop: () => void
    setVolumes: (volumes: Partial<Record<Channel, number>>) => void
    setTempo: (bpm: number) => void
  }
  export const CHANNELS: Channel[]
  export function playBand(
    song: Song,
    options: { bpm: number; style: string; volumes: Partial<Record<Channel, number>>; loop: boolean; countIn: boolean; startBar: number; onBar?: (bar: number | 'count', beat: number) => void; onEnd?: () => void },
  ): Band
}

declare module '@music/voicings.js' {
  import type { Chart, ParsedChartChord, Song } from '@music/chart.js'

  export interface Voicing {
    frets: (number | null)[]
    partial: boolean
    notes: { string: number; fret: number; pitch: number; role: 'root' | 'bass' | number }[]
  }
  export function chartChords(chart: Chart): { symbol: string; chord: ParsedChartChord }[]
  export function voicingsFor(chord: ParsedChartChord, tuning: number[], limit?: number): Voicing[]
  export function fretText(frets: (number | null)[]): string
  export function barSymbols(song: Song): string[][]
}

declare module '@music/sharedResources.js' {
  import type { Link } from '@music/resources.js'

  export interface SharedConfig {
    url: string
    key: string
  }
  export const LIMITS: { title: number; url: number; category: number; description: number }
  export const COOLDOWN_MS: number
  export function sharingEnabled(config?: SharedConfig): boolean
  export function validateSubmission(draft: Record<string, string>): { link: Link; error?: undefined } | { error: string; link?: undefined }
  export function fetchSharedLinks(config?: SharedConfig): Promise<(Link & { id: string; created_at: string })[]>
  export function addSharedLink(link: Link, ownerToken: string, config?: SharedConfig): Promise<Link & { id: string; created_at: string }>
  export function removeSharedLink(id: string, ownerToken: string, config?: SharedConfig): Promise<boolean>
  export function reportSharedLink(id: string, reason: string, config?: SharedConfig): Promise<unknown>
}

declare module '@music/sharedCharts.js' {
  import type { Chart } from '@music/chart.js'
  import type { SharedChartRow } from '@music/chartView.js'
  import type { SharedConfig } from '@music/sharedResources.js'

  export function fetchSharedCharts(config?: SharedConfig): Promise<SharedChartRow[]>
  export function addSharedChart(chart: Chart, ownerToken: string, config?: SharedConfig): Promise<SharedChartRow>
  export function updateSharedChart(id: string, chart: Chart, ownerToken: string, config?: SharedConfig): Promise<boolean>
  export function removeSharedChart(id: string, ownerToken: string, config?: SharedConfig): Promise<boolean>
  export function reportSharedChart(id: string, reason: string, config?: SharedConfig): Promise<unknown>
}

declare module '@music/resources.js' {
  /** A link as saved or shared. */
  export interface Link {
    title: string
    url: string
    category: string
    type: string
    level: string
    tags: string[]
    description: string
  }
  /** A catalog entry. */
  export interface Resource {
    id: string
    index: number
    sharedId?: string
    title: string
    url: string
    category: string
    type: string
    tags: string[]
    level: string
    description: string
    host: string
    addedAt: string
    source: 'repo' | 'shared' | 'local'
  }
  export interface ResourceFilters {
    query?: string
    types?: string[]
    tags?: string[]
    level?: string
    category?: string
    starredOnly?: boolean
    starred?: string[]
  }
  export const RESOURCE_TYPES: string[]
  export const LEVELS: string[]
  export const SORTS: Record<'category' | 'newest' | 'title', string>
  export function normalizeTags(tags: unknown): string[]
  export function linkResources(links: unknown, source?: Resource['source']): Resource[]
  export function filterResources(resources: Resource[], filters: ResourceFilters): Resource[]
  export function sortResources(resources: Resource[], sort: string): Resource[]
  export function tagCounts(resources: Resource[]): [string, number][]
  export function isNew(resource: Resource, now?: number): boolean
  export function tabSearchLinks(query: string): { label: string; note: string; url: string }[]
}
