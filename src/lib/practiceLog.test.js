import { describe, expect, it } from 'vitest'
import { dayKey, practiceSummary, withDay } from './practiceLog.js'

const day = (y, m, d) => new Date(y, m - 1, d, 21, 30)

describe('practice log', () => {
  it('names days by the local calendar date', () => {
    expect(dayKey(day(2026, 3, 7))).toBe('2026-03-07')
  })

  it('shows the last seven days ending today', () => {
    const today = day(2026, 10, 31)
    const { week, count } = practiceSummary(['2026-10-25', '2026-10-28', '2026-10-31', '2026-10-01'], today)
    expect(week.map((d) => d.day)).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'])
    expect(week.map((d) => d.practiced)).toEqual([true, false, false, true, false, false, true])
    expect(count).toBe(3)
  })

  it('counts a run of days, and today not played yet keeps yesterday’s run', () => {
    const today = day(2026, 11, 2)
    expect(practiceSummary(['2026-10-31', '2026-11-01', '2026-11-02'], today).streak).toBe(3)
    expect(practiceSummary(['2026-10-31', '2026-11-01'], today).streak).toBe(2)
    expect(practiceSummary(['2026-10-30', '2026-11-02'], today).streak).toBe(1)
    expect(practiceSummary([], today)).toMatchObject({ streak: 0, count: 0, today: false })
  })

  it('adds today once and forgets very old days', () => {
    const today = day(2026, 10, 31)
    expect(withDay(['2026-10-31'], today)).toEqual(['2026-10-31'])
    expect(withDay(['2025-01-01', '2026-10-30'], today)).toEqual(['2026-10-30', '2026-10-31'])
  })
})
