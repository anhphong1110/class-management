import { describe, expect, it } from 'vitest'
import { CHAT_GREETING, suggestionsFor } from '@/lib/chat/suggestions'

const all = { timetable: true, rank: true }

describe('suggestionsFor', () => {
  it('giáo viên thấy đủ ba gợi ý', () => {
    expect(suggestionsFor('teacher', all)).toEqual(['Hôm nay học gì?', 'Ngày mai học gì?', 'Ai cao sao nhất?'])
  })
  it('học sinh có thêm gợi ý hỏi sao của mình', () => {
    expect(suggestionsFor('student', all)).toEqual(['Hôm nay học gì?', 'Ngày mai học gì?', 'Ai cao sao nhất?', 'Mình có bao nhiêu sao?'])
  })
  it('học sinh bị tắt thời khóa biểu hoặc xếp hạng thì ẩn gợi ý tương ứng', () => {
    expect(suggestionsFor('student', { timetable: false, rank: true })).toEqual(['Ai cao sao nhất?', 'Mình có bao nhiêu sao?'])
    expect(suggestionsFor('student', { timetable: true, rank: false })).toEqual(['Hôm nay học gì?', 'Ngày mai học gì?', 'Mình có bao nhiêu sao?'])
  })
  it('chưa đăng nhập thì không có gợi ý', () => {
    expect(suggestionsFor(null, all)).toEqual([])
  })
  it('lời chào đúng như thiết kế', () => {
    expect(CHAT_GREETING).toBe('Mình là Bông, bạn đồng hành học tập của lớp chúng mình. Mình có thể giúp bạn gì nào?')
  })
})
