import { describe, expect, it } from 'vitest'
import { MISSION_PERIOD_LABELS, missionPeriodKey } from '@/lib/missions/period'
import type { NullableTermDates } from '@/lib/domain/period'

const T: NullableTermDates = { term1Start: '2026-09-05', term1End: '2027-01-15', term2Start: '2027-01-18', term2End: '2027-05-31' }
const key = (p: Parameters<typeof missionPeriodKey>[0], iso: string, terms: NullableTermDates = T) => missionPeriodKey(p, new Date(iso), terms)

describe('missionPeriodKey (khớp private.mission_period_key)', () => {
  it('day theo ngày Việt Nam', () => {
    expect(key('day', '2026-10-31T16:30:00Z')).toBe('2026-10-31')
    expect(key('day', '2026-10-31T17:10:00Z')).toBe('2026-11-01')
  })
  it('thứ Bảy 23:30 và thứ Hai 00:10 giờ VN khác tuần', () => {
    expect(key('week', '2026-10-31T16:30:00Z')).toBe('2026-W44')
    expect(key('week', '2026-11-01T16:30:00Z')).toBe('2026-W44')
    expect(key('week', '2026-11-01T17:10:00Z')).toBe('2026-W45')
  })
  it('tuần ISO qua năm: 31/12/2026 thuộc tuần 53, 4/1/2027 thuộc tuần 1 của 2027', () => {
    expect(key('week', '2026-12-31T05:00:00Z')).toBe('2026-W53')
    expect(key('week', '2027-01-03T16:59:00Z')).toBe('2026-W53')
    expect(key('week', '2027-01-03T17:00:00Z')).toBe('2027-W01')
  })
  it('month theo tháng Việt Nam', () => {
    expect(key('month', '2026-10-31T16:59:00Z')).toBe('2026-10')
    expect(key('month', '2026-10-31T17:10:00Z')).toBe('2026-11')
  })
  it('term: T1 / T2 kèm năm học, đổi đúng 0h ngày bắt đầu học kỳ 2 giờ VN', () => {
    expect(key('term', '2026-11-10T00:00:00Z')).toBe('T1-2026-2027')
    expect(key('term', '2027-01-17T16:59:00Z')).toBe('T1-2026-2027')
    expect(key('term', '2027-01-17T17:00:00Z')).toBe('T2-2026-2027')
  })
  it('term khi chưa nhập ngày: suy từ ngày hiện tại, năm học bắt đầu từ tháng 8', () => {
    const none = { term1Start: null, term1End: null, term2Start: null, term2End: null }
    expect(key('term', '2026-11-10T00:00:00Z', none)).toBe('T1-2026-2027')
    expect(key('term', '2027-03-10T00:00:00Z', none)).toBe('T1-2026-2027')
  })
  it('nhãn kỳ', () => {
    expect(MISSION_PERIOD_LABELS).toEqual({ day: 'Hôm nay', week: 'Tuần này', month: 'Tháng này', term: 'Học kỳ' })
  })
})
