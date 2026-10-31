import { describe, expect, it } from 'vitest'
import { giftButton, requestSuccessMessage, STUDENT_STAT } from '@/lib/student/gifts'

describe('giftButton', () => {
  it('hết quà thắng thiếu sao', () => {
    expect(giftButton({ left: 0, cost: 10 }, 3)).toEqual({ label: 'Hết quà', disabled: true })
  })
  it('thiếu sao', () => {
    expect(giftButton({ left: 2, cost: 25 }, 10)).toEqual({ label: 'Chưa đủ sao (thiếu 15)', disabled: true })
  })
  it('đủ sao', () => {
    expect(giftButton({ left: 2, cost: 25 }, 25)).toEqual({ label: 'Đổi quà', disabled: false })
  })
})

describe('requestSuccessMessage', () => {
  it('có giữ sao', () => {
    expect(requestSuccessMessage('Sticker vũ trụ', 10, true)).toBe(
      'Đã gửi yêu cầu đổi "Sticker vũ trụ". Hệ thống giữ 10 sao cho em, chờ cô duyệt.',
    )
  })
  it('không giữ sao thì bỏ vế giữ sao', () => {
    expect(requestSuccessMessage('Sticker vũ trụ', 10, false)).toBe('Đã gửi yêu cầu đổi "Sticker vũ trụ", chờ cô duyệt.')
  })
})

describe('STUDENT_STAT', () => {
  it('pending đổi thành Chờ cô duyệt, còn lại giữ nhãn của giáo viên', () => {
    expect(STUDENT_STAT.pending[0]).toBe('Chờ cô duyệt')
    expect(STUDENT_STAT.approved[0]).toBe('Đã duyệt, chờ trao')
  })
})
