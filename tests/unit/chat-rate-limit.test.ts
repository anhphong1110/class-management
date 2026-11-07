import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '@/lib/chat/rate-limit'

describe('createRateLimiter', () => {
  it('cho tối đa N lần trong cửa sổ rồi chặn', () => {
    const rl = createRateLimiter({ max: 3, windowMs: 60_000, now: () => 0 })
    expect([rl.take('u1'), rl.take('u1'), rl.take('u1'), rl.take('u1')]).toEqual([true, true, true, false])
  })
  it('mỗi người tính riêng', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000, now: () => 0 })
    expect(rl.take('a')).toBe(true)
    expect(rl.take('b')).toBe(true)
    expect(rl.take('a')).toBe(false)
  })
  it('hết cửa sổ thì được hỏi lại', () => {
    let t = 0
    const rl = createRateLimiter({ max: 1, windowMs: 1000, now: () => t })
    expect(rl.take('u')).toBe(true)
    expect(rl.take('u')).toBe(false)
    t = 1001
    expect(rl.take('u')).toBe(true)
  })
})
