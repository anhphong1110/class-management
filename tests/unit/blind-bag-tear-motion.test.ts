import { describe, expect, it } from 'vitest'
import { TearMotion, TEAR_COMMIT_THRESHOLD } from '@/lib/blind-bag/tear-motion'

function run(m: TearMotion, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) m.advance(1 / 60)
}

describe('TearMotion', () => {
  it('khóa hướng sau 12px', () => {
    const m = new TearMotion()
    expect(m.lockDirection(5)).toBe(false)
    expect(m.lockDirection(-14)).toBe(true)
    expect(m.direction).toBe(-1)
  })
  it('target đơn điệu: kéo lùi không làm progress giảm', () => {
    const m = new TearMotion()
    m.scrub(0.6)
    m.scrub(0.2)
    run(m, 1)
    expect(m.progress).toBeGreaterThan(0.5)
  })
  it('thả tay dưới ngưỡng thì dán lại', () => {
    const m = new TearMotion()
    m.scrub(TEAR_COMMIT_THRESHOLD - 0.05)
    run(m, 0.5)
    expect(m.settle().opened).toBe(false)
    run(m, 3)
    expect(m.progress).toBe(0)
    expect(m.released).toBe(false)
  })
  it('thả tay qua ngưỡng thì xé hẳn và dải rơi', () => {
    const m = new TearMotion()
    m.scrub(TEAR_COMMIT_THRESHOLD + 0.01)
    expect(m.settle().opened).toBe(true)
    run(m, 3)
    expect(m.progress).toBe(1)
    expect(m.fallProgress).toBe(1)
  })
  it('quyết theo quãng kéo, không theo vị trí lò xo: vuốt nhanh vẫn mở', () => {
    const m = new TearMotion()
    m.scrub(1)
    expect(m.settle().opened).toBe(true)
  })
})
