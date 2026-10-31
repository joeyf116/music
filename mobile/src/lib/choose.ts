// A list sheet any screen can open to pick one value (a sound, a rhythm level, a chart's key…). The screen hands
// over the options and what to do with the choice; the sheet (components/ChooseSheet.tsx, a `choose` route in each
// tab's stack) shows them as a native grouped list and closes when one is tapped.
import { router, type Href } from 'expo-router'

export type ChoiceValue = string | number | boolean

export interface ChooseOption<V extends ChoiceValue = ChoiceValue> {
  value: V
  label: string
  sub?: string
  disabled?: boolean
}

export interface ChooseSection<V extends ChoiceValue = ChoiceValue> {
  title?: string
  options: ChooseOption<V>[]
}

export interface ChooseRequest<V extends ChoiceValue = ChoiceValue> {
  title: string
  sections: ChooseSection<V>[]
  value: V | null
  onChoose: (value: V) => void
}

let pending: ChooseRequest | null = null

/** Opens the `choose` sheet of the stack at `path` (e.g. '/rhythm/choose') with these options. */
export function choose<V extends ChoiceValue>(path: Href, request: ChooseRequest<V>): void {
  pending = request as unknown as ChooseRequest
  router.push(path)
}

/** The request the sheet is showing (it stays readable while the sheet animates closed). */
export const currentChoice = (): ChooseRequest | null => pending

/** Options from a flat list, for the common case of one section. */
export const oneSection = <V extends ChoiceValue>(options: ChooseOption<V>[]): ChooseSection<V>[] => [{ options }]
