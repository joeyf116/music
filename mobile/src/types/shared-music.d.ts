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
  export interface ProgressionPreset {
    name: string
    text: string
  }
  export const PROGRESSIONS: ProgressionPreset[]
  export const NECK_AREAS: Record<string, { name: string; fret: number }>
  export function randomProgression(mode?: 'major' | 'minor', length?: number, random?: () => number): string
}

declare module '@music/audio.js' {
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
