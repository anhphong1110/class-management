import { describe, expect, it } from 'vitest'
import { createBreaker, createTtlCache } from '@/lib/chat/cache'

describe('createTtlCache', () => {
  it('trả lại giá trị trong thời hạn rồi hết hạn', () => {
    let t = 0
    const cache = createTtlCache<string>({ ttlMs: 1000, now: () => t })
    cache.set('k', 'v')
    expect(cache.get('k')).toBe('v')
    t = 999
    expect(cache.get('k')).toBe('v')
    t = 1000
    expect(cache.get('k')).toBeUndefined()
  })
  it('giới hạn số mục, bỏ mục cũ nhất', () => {
    const cache = createTtlCache<number>({ ttlMs: 1000, maxEntries: 2, now: () => 0 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })
})

describe('createBreaker', () => {
  it('mở sau khi báo lỗi và tự đóng lại sau thời gian chờ', () => {
    let t = 0
    const breaker = createBreaker({ cooldownMs: 60_000, now: () => t })
    expect(breaker.isOpen()).toBe(false)
    breaker.trip()
    expect(breaker.isOpen()).toBe(true)
    t = 59_999
    expect(breaker.isOpen()).toBe(true)
    t = 60_000
    expect(breaker.isOpen()).toBe(false)
  })
})
