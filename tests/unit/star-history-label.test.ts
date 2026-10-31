import { describe, expect, it } from 'vitest'
import { starHistoryLabel, type StarTxLabelInput } from '@/lib/student/history-label'

const tx = (kind: string, note: string | null = null, criterion_id: string | null = null): StarTxLabelInput => ({ kind, note, criterion_id })
const labels = new Map([['c-read', 'Đọc sách']])

describe('starHistoryLabel (khớp v_my_star_history)', () => {
  it('trừ sao luôn che lý do', () => {
    expect(starHistoryLabel(tx('penalty', 'nói chuyện riêng', 'c-x'), null, labels)).toBe('Trừ sao')
  })
  it('hoàn tác của trừ sao cũng là Trừ sao', () => {
    expect(starHistoryLabel(tx('reversal'), tx('penalty', 'lý do'), labels)).toBe('Trừ sao')
  })
  it('cộng sao: tiêu chí trước, rồi ghi chú, rồi Cộng sao', () => {
    expect(starHistoryLabel(tx('award', 'ghi chú', 'c-read'), null, labels)).toBe('Đọc sách')
    expect(starHistoryLabel(tx('award', 'Nhiệm vụ: M1'), null, labels)).toBe('Nhiệm vụ: M1')
    expect(starHistoryLabel(tx('award', ''), null, labels)).toBe('Cộng sao')
    expect(starHistoryLabel(tx('award', null, 'c-không-còn-là-tiêu-chí-cộng'), null, labels)).toBe('Cộng sao')
  })
  it('hoàn tác của cộng sao lấy nhãn của dòng gốc', () => {
    expect(starHistoryLabel(tx('reversal'), tx('award', null, 'c-read'), labels)).toBe('Đọc sách')
    expect(starHistoryLabel(tx('reversal'), tx('award', 'Nhiệm vụ: M1'), labels)).toBe('Nhiệm vụ: M1')
  })
  it('hoàn tác không rõ dòng gốc thì rơi về Cộng sao', () => {
    expect(starHistoryLabel(tx('reversal'), null, labels)).toBe('Cộng sao')
  })
  it('giữ, hoàn sao và đổi quà', () => {
    expect(starHistoryLabel(tx('reserve'), null, labels)).toBe('Giữ sao đổi quà')
    expect(starHistoryLabel(tx('release'), null, labels)).toBe('Hoàn sao đã giữ')
    expect(starHistoryLabel(tx('redeem'), null, labels)).toBe('Đổi quà')
  })
})
