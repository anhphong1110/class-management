import { describe, expect, it } from 'vitest'
import { giftButton, giftsHeroHint, requestSuccessMessage, STUDENT_STAT } from '@/lib/student/gifts'

describe('giftButton', () => {
  it('hết quà thắng thiếu sao', () => {
    expect(giftButton({ left: 0, cost: 10 }, 3, true)).toEqual({ label: 'Hết quà', disabled: true })
  })
  it('thiếu sao', () => {
    expect(giftButton({ left: 2, cost: 25 }, 10, true)).toEqual({ label: 'Chưa đủ sao (thiếu 15)', disabled: true })
  })
  it('only_enough và reserve_on_request cùng tắt: thiếu sao vẫn cho gửi, giống request_reward', () => {
    expect(giftButton({ left: 2, cost: 25 }, 10, false)).toEqual({ label: 'Đổi quà', disabled: false })
    expect(giftButton({ left: 0, cost: 25 }, 10, false)).toEqual({ label: 'Hết quà', disabled: true })
  })
  it('đủ sao', () => {
    expect(giftButton({ left: 2, cost: 25 }, 25, true)).toEqual({ label: 'Đổi quà', disabled: false })
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

describe('requestSuccessMessage khi cô tắt duyệt', () => {
  it('đã tự duyệt thì không nói chờ duyệt', () => {
    expect(requestSuccessMessage('Sticker vũ trụ', 10, true, true)).toBe('Đổi quà "Sticker vũ trụ" thành công. Cô sẽ trao quà cho em nhé.')
    expect(requestSuccessMessage('Sticker vũ trụ', 10, false, true)).not.toContain('chờ cô duyệt')
  })
  it('dòng đầu trang không nhắc cô duyệt khi tắt duyệt', () => {
    expect(giftsHeroHint(true)).toContain('cô giáo duyệt')
    expect(giftsHeroHint(false)).not.toContain('duyệt')
  })
})

describe('STUDENT_STAT', () => {
  it('pending đổi thành Chờ cô duyệt, còn lại giữ nhãn của giáo viên', () => {
    expect(STUDENT_STAT.pending[0]).toBe('Chờ cô duyệt')
    expect(STUDENT_STAT.approved[0]).toBe('Đã duyệt, chờ trao')
  })
})
