import { describe, expect, it } from 'vitest'
import { resolveReportRange } from '@/lib/reports/range'

const T = { term1Start: '2026-09-05', term1End: '2027-01-15', term2Start: '2027-01-18', term2End: '2027-05-31' }
const NO_TERMS = { term1Start: null, term1End: null, term2Start: null, term2End: null }
const NOT_SET = 'Cô chưa đặt ngày học kỳ trong Cài đặt.'

describe('resolveReportRange', () => {
  it('tuần: thứ Hai đến Chủ Nhật, chia theo ngày', () => {
    // Thứ Tư 2026-11-04 giờ Việt Nam
    expect(resolveReportRange('week', new Date('2026-11-04T03:00:00Z'), T)).toEqual({
      from: '2026-11-02', to: '2026-11-08', bucket: 'day', name: 'Tuần này',
    })
  })
  it('tuần: 23:59:59 Chủ Nhật giờ Việt Nam vẫn thuộc tuần đó', () => {
    const r = resolveReportRange('week', new Date('2026-11-01T16:59:59Z'), T)
    expect(r.from).toBe('2026-10-26')
    expect(r.to).toBe('2026-11-01')
  })
  it('tuần: 00:00 thứ Hai giờ Việt Nam sang tuần mới', () => {
    const r = resolveReportRange('week', new Date('2026-11-01T17:00:00Z'), T)
    expect(r.from).toBe('2026-11-02')
    expect(r.to).toBe('2026-11-08')
  })
  it('tháng: từ mùng 1 đến ngày cuối, chia theo tuần', () => {
    expect(resolveReportRange('month', new Date('2026-02-10T00:00:00Z'), T)).toEqual({
      from: '2026-02-01', to: '2026-02-28', bucket: 'week', name: 'Tháng này',
    })
  })
  it('tháng: giờ Việt Nam đã sang tháng mới dù UTC chưa', () => {
    const r = resolveReportRange('month', new Date('2026-10-31T17:30:00Z'), T)
    expect(r.from).toBe('2026-11-01')
    expect(r.to).toBe('2026-11-30')
  })
  it('học kỳ 1 theo ngày học kỳ, chia theo tháng', () => {
    expect(resolveReportRange('term', new Date('2026-11-10T00:00:00Z'), T)).toEqual({
      from: '2026-09-05', to: '2027-01-15', bucket: 'month', name: 'Học kỳ',
    })
  })
  it('học kỳ 2 khi đã tới ngày bắt đầu học kỳ 2', () => {
    const r = resolveReportRange('term', new Date('2027-02-10T00:00:00Z'), T)
    expect(r.from).toBe('2027-01-18')
    expect(r.to).toBe('2027-05-31')
  })
  it('học kỳ 1 khi chỉ mới đặt học kỳ 1', () => {
    const r = resolveReportRange('term', new Date('2026-11-10T00:00:00Z'), { ...T, term2Start: null, term2End: null })
    expect(r.from).toBe('2026-09-05')
    expect(r.to).toBe('2027-01-15')
  })
  it('học kỳ chưa đặt ngày thì báo lỗi', () => {
    expect(() => resolveReportRange('term', new Date('2026-11-10T00:00:00Z'), NO_TERMS)).toThrow(NOT_SET)
  })
  it('cả năm: từ đầu học kỳ 1 tới cuối học kỳ 2', () => {
    expect(resolveReportRange('year', new Date('2026-11-10T00:00:00Z'), T)).toEqual({
      from: '2026-09-05', to: '2027-05-31', bucket: 'month', name: 'Cả năm',
    })
  })
  it('cả năm chưa đặt ngày học kỳ thì báo lỗi', () => {
    expect(() => resolveReportRange('year', new Date('2026-11-10T00:00:00Z'), NO_TERMS)).toThrow(NOT_SET)
    expect(() => resolveReportRange('year', new Date('2026-11-10T00:00:00Z'), { ...T, term2End: null })).toThrow(NOT_SET)
  })

  describe('tùy chọn ngày', () => {
    const now = new Date('2026-11-10T00:00:00Z')
    const custom = (from: string, to: string) => resolveReportRange('custom', now, T, { from, to })
    it('14 ngày vẫn chia theo ngày, 15 ngày chia theo tuần', () => {
      expect(custom('2026-03-01', '2026-03-14').bucket).toBe('day')
      expect(custom('2026-03-01', '2026-03-15').bucket).toBe('week')
    })
    it('92 ngày vẫn chia theo tuần, 93 ngày chia theo tháng', () => {
      expect(custom('2026-01-01', '2026-04-02').bucket).toBe('week') // 31+28+31+2 = 92 ngày
      expect(custom('2026-01-01', '2026-04-03').bucket).toBe('month')
    })
    it('một ngày vẫn hợp lệ, giữ nguyên from/to và đặt tên theo khoảng', () => {
      expect(custom('2026-03-05', '2026-03-05')).toEqual({
        from: '2026-03-05', to: '2026-03-05', bucket: 'day', name: 'Từ 05/03/2026 đến 05/03/2026',
      })
    })
    it('thiếu ngày, ngày không có thật, từ sau đến, hoặc quá 400 ngày thì báo lỗi', () => {
      const bad = 'Khoảng ngày chưa hợp lệ: ngày bắt đầu không được sau ngày kết thúc, tối đa 400 ngày.'
      expect(() => resolveReportRange('custom', now, T)).toThrow(bad)
      expect(() => custom('2026-02-31', '2026-03-05')).toThrow(bad)
      expect(() => custom('2026-03-06', '2026-03-05')).toThrow(bad)
      expect(() => custom('2026-01-01', '2027-02-05')).toThrow(bad)
      expect(custom('2026-01-01', '2027-02-04').bucket).toBe('month')
    })
    it('không cần ngày học kỳ', () => {
      expect(resolveReportRange('custom', now, NO_TERMS, { from: '2026-03-01', to: '2026-03-02' }).bucket).toBe('day')
    })
  })
})
