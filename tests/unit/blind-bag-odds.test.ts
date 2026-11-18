import { describe, expect, it } from 'vitest'
import { bagPrice, oddsOf, rarityTier } from '@/lib/blind-bag/odds'

describe('bagPrice', () => {
  it('trung bình cộng, làm tròn', () => {
    expect(bagPrice([10, 30, 50])).toBe(30)
    expect(bagPrice([10, 25])).toBe(18)
  })
  it('tối thiểu 1, rỗng thì 0', () => {
    expect(bagPrice([1, 1])).toBe(1)
    expect(bagPrice([])).toBe(0)
  })
})

describe('oddsOf', () => {
  it('tổng bằng 1', () => {
    expect(oddsOf([10, 30, 50]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
  })
  it('quà càng nhiều sao xác suất càng thấp', () => {
    const [a, b, c] = oddsOf([10, 30, 50])
    expect(a).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(c)
  })
  it('{10, 50}: 83% / 17%', () => {
    const [a, b] = oddsOf([10, 50])
    expect(a).toBeCloseTo(5 / 6, 6)
    expect(b).toBeCloseTo(1 / 6, 6)
  })
})

describe('rarityTier', () => {
  it('rẻ nhất 0, đắt nhất 4', () => {
    expect(rarityTier(10, [10, 30, 50])).toBe(0)
    expect(rarityTier(50, [10, 30, 50])).toBe(4)
    expect(rarityTier(30, [10, 30, 50])).toBe(2)
  })
  it('một mức giá duy nhất thì bậc 0', () => {
    expect(rarityTier(10, [10, 10])).toBe(0)
  })
})
