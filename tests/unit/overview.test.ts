import { describe, expect, it } from 'vitest'
import { buildOverviewStats, sumWeekStars, teacherGreetingName } from '@/lib/overview/stats'

const base = {
  studentCount: 10,
  weekAwarded: 86,
  weekPenalized: 7,
  redeemedCount: 4,
  pendingRewards: 1,
  starsOver100: 3,
}
const by = (i: Parameters<typeof buildOverviewStats>[0]) => buildOverviewStats(i)

describe('buildOverviewStats', () => {
  it('returns four cards in design order', () => {
    expect(by(base)).toEqual([
      { label: 'Tổng số học sinh', value: '10', sub: 'đang học trong lớp' },
      { label: 'Sao thi đua tuần này', value: '+86', sub: 'đã trừ 7 sao' },
      { label: 'Lượt đổi quà', value: '4', sub: '1 yêu cầu chờ duyệt' },
      { label: 'Học sinh nổi bật', value: '3', sub: 'đạt mốc 100 sao' },
    ])
  })
})

describe('teacherGreetingName', () => {
  it('keeps the title, lowercased', () => {
    expect(teacherGreetingName('Cô Khanh')).toBe('cô Khanh')
    expect(teacherGreetingName('Thầy Nam')).toBe('thầy Nam')
    expect(teacherGreetingName('  CÔ  Mai Khanh ')).toBe('cô Mai Khanh')
  })
  it('handles NFD input', () => {
    expect(teacherGreetingName('Cô Khanh'.normalize('NFD'))).toBe('cô Khanh')
  })
  it('prepends cô without a title', () => {
    expect(teacherGreetingName('Khanh')).toBe('cô Khanh')
    expect(teacherGreetingName('')).toBe('cô')
  })
})

describe('sumWeekStars', () => {
  it('sums awards and penalties', () => {
    expect(sumWeekStars([{ kind: 'award', delta: 3 }, { kind: 'award', delta: 2 }, { kind: 'penalty', delta: -4 }])).toEqual({ awarded: 5, penalized: 4 })
  })
  it('undo cancels the original bucket', () => {
    expect(
      sumWeekStars([
        { kind: 'award', delta: 2 },
        { kind: 'reversal', delta: -2, originalKind: 'award' },
        { kind: 'penalty', delta: -3 },
        { kind: 'reversal', delta: 3, originalKind: 'penalty' },
      ]),
    ).toEqual({ awarded: 0, penalized: 0 })
  })
  it('undo of an earlier-week award reduces this week, never below zero', () => {
    expect(sumWeekStars([{ kind: 'reversal', delta: -2, originalKind: 'award' }])).toEqual({ awarded: 0, penalized: 0 })
  })
})
