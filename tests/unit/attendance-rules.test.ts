import { describe, expect, it } from 'vitest'
import { attended } from '@/lib/attendance/rules'

describe('attended', () => {
  it('present and late count as attended', () => {
    expect(attended('present')).toBe(true)
    expect(attended('late')).toBe(true)
  })
  it('absences do not count', () => {
    expect(attended('absent_excused')).toBe(false)
    expect(attended('absent_unexcused')).toBe(false)
  })
})
