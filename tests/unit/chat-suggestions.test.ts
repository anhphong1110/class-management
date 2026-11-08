import { describe, expect, it } from 'vitest'
import { CHAT_GREETING, CHAT_UNKNOWN, suggestionsFor } from '@/lib/chat/suggestions'

const all = { timetable: true, rank: true, rewards: true }

describe('suggestionsFor', () => {
  it('giáo viên thấy đủ gợi ý, không có câu hỏi sao của mình', () => {
    expect(suggestionsFor('teacher', all)).toEqual(['Hôm nay học gì?', 'Ngày mai học gì?', 'Ai cao sao nhất?', 'Quà đang có?', 'Lớp có bao nhiêu bạn?'])
  })
  it('học sinh có thêm gợi ý hỏi sao của mình', () => {
    expect(suggestionsFor('student', all)).toEqual([
      'Hôm nay học gì?',
      'Ngày mai học gì?',
      'Ai cao sao nhất?',
      'Quà đang có?',
      'Mình có bao nhiêu sao?',
      'Lớp có bao nhiêu bạn?',
    ])
  })
  it('học sinh bị tắt thời khóa biểu, xếp hạng hoặc quà thì ẩn gợi ý tương ứng', () => {
    expect(suggestionsFor('student', { timetable: false, rank: true, rewards: false })).toEqual([
      'Ai cao sao nhất?',
      'Mình có bao nhiêu sao?',
      'Lớp có bao nhiêu bạn?',
    ])
    expect(suggestionsFor('student', { timetable: true, rank: false, rewards: true })).toEqual([
      'Hôm nay học gì?',
      'Ngày mai học gì?',
      'Quà đang có?',
      'Mình có bao nhiêu sao?',
      'Lớp có bao nhiêu bạn?',
    ])
  })
  it('chưa đăng nhập thì không có gợi ý', () => {
    expect(suggestionsFor(null, all)).toEqual([])
  })
  it('lời chào đúng như thiết kế', () => {
    expect(CHAT_GREETING).toBe('Mình là Bông, bạn đồng hành học tập của lớp chúng mình. Mình có thể giúp bạn gì nào?')
  })
  it('câu khi không có dữ liệu', () => {
    expect(CHAT_UNKNOWN).toBe('Mình chưa có dữ liệu cho câu hỏi, bạn liên hệ cô chủ nhiệm nhé.')
  })
})
