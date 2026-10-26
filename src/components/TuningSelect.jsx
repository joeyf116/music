import { TUNING_GROUPS, TUNINGS, tuningNotes } from '../lib/theory.js'

const BY_GROUP = TUNING_GROUPS.map((group) => [group, Object.entries(TUNINGS).filter(([, t]) => t.group === group)])

/** Tuning picker, grouped into standard, drop, open and other tunings, showing each tuning's string names. */
export default function TuningSelect({ value, onChange, ...props }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {BY_GROUP.map(([group, tunings]) => (
        <optgroup key={group} label={group}>
          {tunings.map(([id, t]) => (
            <option key={id} value={id}>
              {t.name === tuningNotes(t).replaceAll(' ', '') ? t.name : `${t.name} (${tuningNotes(t)})`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
