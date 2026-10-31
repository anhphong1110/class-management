import { describe, expect, it } from 'vitest'
import { PERIOD_LABELS, periodRange } from '@/lib/domain/period'

const T = { term1Start: '2026-09-05', term1End: '2027-01-15', term2Start: '2027-01-18', term2End: '2027-05-31' }

describe('periodRange', () => {
  it('week starts Monday 00:00 Vietnam time', () => {
    expect(periodRange('week', new Date('2026-10-31T16:30:00Z'), T)).toEqual({
      from: '2026-10-25T17:00:00.000Z',
      to: '2026-11-01T17:00:00.000Z',
    })
  })
  it('week rolls over at Monday 00:00 Vietnam', () => {
    expect(periodRange('week', new Date('2026-11-01T17:10:00Z'), T).from).toBe('2026-11-01T17:00:00.000Z')
  })
  it('month uses Vietnam calendar month', () => {
    const r = periodRange('month', new Date('2026-10-31T18:00:00Z'), T)
    expect(r.from).toBe('2026-10-31T17:00:00.000Z')
    expect(r.to).toBe('2026-11-30T17:00:00.000Z')
  })
  it('term 1', () => {
    expect(periodRange('term', new Date('2026-11-10T00:00:00Z'), T)).toEqual({
      from: '2026-09-04T17:00:00.000Z',
      to: '2027-01-15T17:00:00.000Z',
    })
  })
  it('term 2', () => {
    expect(periodRange('term', new Date('2027-02-10T00:00:00Z'), T)).toEqual({
      from: '2027-01-17T17:00:00.000Z',
      to: '2027-05-31T17:00:00.000Z',
    })
  })
  it('year is unbounded', () => {
    expect(periodRange('year', new Date(), T)).toEqual({ from: null, to: null })
  })
  it('labels', () => {
    expect(PERIOD_LABELS).toEqual({ week: 'Tuần này', month: 'Tháng này', term: 'Học kỳ', year: 'Cả năm' })
  })
})
