import { describe, expect, it } from 'vitest'
import { maskNames, matchIntent, normalize } from '@/lib/chat/intents'

const roster = [
  { id: 'a', fullName: 'Nguyễn Minh Anh' },
  { id: 'b', fullName: 'Trần Gia Huy' },
  { id: 'c', fullName: 'Lê Bảo Ngọc' },
  { id: 'd', fullName: 'Phạm Quốc Huy' },
]

describe('normalize', () => {
  it('bỏ dấu, chữ thường, gộp khoảng trắng và dấu câu', () => {
    expect(normalize('  Hôm nay  HỌC tiết gì?? ')).toBe('hom nay hoc tiet gi')
    expect(normalize('Đặng Đức')).toBe('dang duc')
  })
})

describe('matchIntent: thời khóa biểu', () => {
  it('hỏi hôm nay, có dấu hoặc không dấu', () => {
    expect(matchIntent('hôm nay học tiết gì', [])).toEqual({ intent: 'timetable', day: 'today' })
    expect(matchIntent('hom nay hoc gi', [])).toEqual({ intent: 'timetable', day: 'today' })
  })
  it('hỏi ngày mai', () => {
    expect(matchIntent('Ngày mai học gì vậy?', [])).toEqual({ intent: 'timetable', day: 'tomorrow' })
  })
  it('hỏi một thứ cụ thể', () => {
    // 1 = Thứ Hai ... 6 = Thứ Bảy, 0 = Chủ Nhật (cùng quy ước với timetable_slots.weekday).
    expect(matchIntent('thứ ba học môn gì', [])).toEqual({ intent: 'timetable', day: 2 })
    expect(matchIntent('thu 5 co tiet gi', [])).toEqual({ intent: 'timetable', day: 4 })
    expect(matchIntent('thứ bảy có học không', [])).toEqual({ intent: 'timetable', day: 6 })
    expect(matchIntent('chủ nhật học gì', [])).toEqual({ intent: 'timetable', day: 0 })
  })
  it('không nêu ngày thì mặc định hôm nay', () => {
    expect(matchIntent('thời khóa biểu', [])).toEqual({ intent: 'timetable', day: 'today' })
    expect(matchIntent('hôm nay có tiết gì', [])).toEqual({ intent: 'timetable', day: 'today' })
  })
})

describe('matchIntent: bảng xếp hạng', () => {
  it('ai cao sao nhất, mặc định cả năm và top 3', () => {
    expect(matchIntent('bạn nào đang cao sao nhất', [])).toEqual({ intent: 'top_stars', period: 'year', limit: 3 })
  })
  it('nhận kỳ và số lượng', () => {
    expect(matchIntent('ai nhiều sao nhất tuần này', [])).toEqual({ intent: 'top_stars', period: 'week', limit: 3 })
    expect(matchIntent('top 5 tháng này', [])).toEqual({ intent: 'top_stars', period: 'month', limit: 5 })
    expect(matchIntent('xếp hạng học kỳ', [])).toEqual({ intent: 'top_stars', period: 'term', limit: 3 })
    expect(matchIntent('top 99 sao', [])).toEqual({ intent: 'top_stars', period: 'year', limit: 10 })
  })
})

describe('matchIntent: số sao', () => {
  it('học sinh hỏi sao của mình', () => {
    expect(matchIntent('mình có bao nhiêu sao', [])).toEqual({ intent: 'my_stars' })
    expect(matchIntent('Sao của em là bao nhiêu', [])).toEqual({ intent: 'my_stars' })
  })
  it('giáo viên hỏi sao của một bạn trong lớp', () => {
    expect(matchIntent('Gia Huy được bao nhiêu sao', roster)).toEqual({ intent: 'student_stars', studentIds: ['b'] })
    expect(matchIntent('sao của bảo ngọc', roster)).toEqual({ intent: 'student_stars', studentIds: ['c'] })
  })
  it('tên chỉ trùng phần tên gọi thì trả về mọi bạn trùng', () => {
    expect(matchIntent('Huy có bao nhiêu sao', roster)).toEqual({ intent: 'student_stars', studentIds: ['b', 'd'] })
  })
  it('tên Minh không bị nhầm với "mình" khi lớp có bạn tên Minh', () => {
    expect(matchIntent('Minh Anh có bao nhiêu sao', roster)).toEqual({ intent: 'student_stars', studentIds: ['a'] })
  })
  it('hỏi sao của bạn không có trong lớp thì trả danh sách rỗng', () => {
    expect(matchIntent('Tú được bao nhiêu sao', roster)).toEqual({ intent: 'student_stars', studentIds: [] })
  })
  it('học sinh hỏi sao của bạn khác', () => {
    expect(matchIntent('sao của Gia Huy', [])).toEqual({ intent: 'student_stars', studentIds: [] })
  })
})

describe('matchIntent: không hiểu', () => {
  it('trả null', () => {
    expect(matchIntent('hôm qua trời mưa không', [])).toBeNull()
    expect(matchIntent('', [])).toBeNull()
  })
})

describe('maskNames', () => {
  it('che tên đầy đủ và tên gọi bằng ký hiệu', () => {
    const { masked, refs } = maskNames('Gia Huy hôm nay học gì, Bảo Ngọc thì sao', roster)
    expect(masked).not.toMatch(/huy|ngọc/i)
    expect(masked).toContain('{HS1}')
    expect(masked).toContain('{HS2}')
    expect(refs).toEqual({ HS1: ['b'], HS2: ['c'] })
  })
  it('không đổi gì khi không có tên', () => {
    expect(maskNames('ai cao sao nhất', roster)).toEqual({ masked: 'ai cao sao nhất', refs: {} })
  })
})
