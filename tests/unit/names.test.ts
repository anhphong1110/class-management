import { describe, expect, it } from 'vitest'
import { joinNames } from '@/lib/domain/names'

describe('joinNames', () => {
  it('one', () => expect(joinNames(['A'])).toBe('A'))
  it('two', () => expect(joinNames(['A', 'B'])).toBe('A, B'))
  it('four', () => expect(joinNames(['A', 'B', 'C', 'D'])).toBe('A, B và 2 bạn khác'))
})
