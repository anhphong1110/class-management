import { describe, expect, it } from 'vitest'
import { buildOverviewStats, sumWeekStars, teacherGreetingName } from '@/lib/overview/stats'

const base = {
  studentCount: 10,
  attendanceToday: { present: 8, late: 1, absent_excused: 1, absent_unexcused: 0 },
  weekAwarded: 86,
  weekPenalized: 7,
  redeemedCount: 4,
  pendingRewards: 1,
  starsOver100: 3,
}
const by = (i: Parameters<typeof buildOverviewStats>[0]) => buildOverviewStats(i)

describe('buildOverviewStats', () => {
  it('returns six cards in design order', () => {
    expect(by(base)).toEqual([
      { label: 'Tổng số học sinh', value: '10', sub: 'đang học trong lớp' },
      { label: 'Có mặt hôm nay', value: '9/10', sub: '1 bạn đi trễ' },
      { label: 'Vắng hôm nay', value: '1', sub: 'vắng có phép' },
      { label: 'Sao thi đua tuần này', value: '+86', sub: 'đã trừ 7 sao' },
      { label: 'Lượt đổi quà', value: '4', sub: '1 yêu cầu chờ duyệt' },
      { label: 'Học sinh nổi bật', value: '3', sub: 'đạt mốc 100 sao' },
    ])
  })
  it('no attendance rows today', () => {
    const s = by({ ...base, attendanceToday: { present: 0, late: 0, absent_excused: 0, absent_unexcused: 0 } })
    expect(s[1]).toMatchObject({ value: '—', sub: 'Chưa điểm danh' })
    expect(s[2]).toMatchObject({ value: '—', sub: 'Chưa điểm danh' })
  })
  it('absent wording', () => {
    const a = (e: number, u: number) =>
      by({ ...base, attendanceToday: { present: 5, late: 0, absent_excused: e, absent_unexcused: u } })[2]
    expect(a(0, 2)).toMatchObject({ value: '2', sub: 'vắng không phép' })
    expect(a(1, 2)).toMatchObject({ value: '3', sub: '1 có phép, 2 không phép' })
  })
  it('all present: zero absent', () => {
    const s = by({ ...base, attendanceToday: { present: 10, late: 0, absent_excused: 0, absent_unexcused: 0 } })
    expect(s[1]).toMatchObject({ value: '10/10', sub: '0 bạn đi trễ' })
    expect(s[2].value).toBe('0')
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
