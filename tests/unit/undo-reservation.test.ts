import { describe, expect, it } from 'vitest'
import { allBlockedByReservation, blockedByReservation } from '@/lib/stars/undo'

describe('blockedByReservation', () => {
  it('thiếu vì sao đang giữ: nhả ra thì đủ', () => {
    expect(blockedByReservation({ available: 2, held: 5, needed: 5 })).toBe(true)
  })
  it('không giữ sao nào: thiếu vì lý do khác', () => {
    expect(blockedByReservation({ available: 2, held: 0, needed: 5 })).toBe(false)
  })
  it('có giữ nhưng nhả ra vẫn không đủ', () => {
    expect(blockedByReservation({ available: 0, held: 2, needed: 5 })).toBe(false)
  })
  it('đã đủ sao thì không bị chặn', () => {
    expect(blockedByReservation({ available: 5, held: 3, needed: 5 })).toBe(false)
  })
})

describe('allBlockedByReservation', () => {
  it('rỗng thì false', () => expect(allBlockedByReservation([])).toBe(false))
  it('một bạn thiếu vì lý do khác thì false', () => {
    expect(
      allBlockedByReservation([
        { available: 1, held: 4, needed: 5 },
        { available: 1, held: 0, needed: 5 },
      ]),
    ).toBe(false)
  })
})
