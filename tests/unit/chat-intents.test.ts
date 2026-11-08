import { describe, expect, it } from 'vitest'
import { maskNames, matchIntent, needsCatalog, normalize } from '@/lib/chat/intents'

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
  it('tên gọi trùng từ thường dùng chỉ bị che khi viết hoa', () => {
    const lop = [
      { id: 't', fullName: 'Đỗ Anh Tuấn' },
      { id: 'm', fullName: 'Lê Thị Mai' },
    ]
    expect(maskNames('tuần này ai cao sao nhất', lop).masked).toBe('tuần này ai cao sao nhất')
    expect(maskNames('ngày mai học gì', lop).masked).toBe('ngày mai học gì')
    expect(maskNames('Tuấn được bao nhiêu sao', lop).masked).toBe('{HS1} được bao nhiêu sao')
    expect(maskNames('Mai học gì', lop).masked).toBe('{HS1} học gì')
  })
  it('che cả tên cô giáo khi được đưa vào danh sách', () => {
    const withTeacher = [...roster, { id: 'teacher', fullName: 'Nguyễn Mai Khanh' }]
    const { masked, refs } = maskNames('cô Mai Khanh dạy môn gì', withTeacher)
    expect(masked).not.toMatch(/khanh/i)
    expect(refs.HS1).toEqual(['teacher'])
  })
})

const catalog = { subjects: ['Toán', 'Tiếng Việt', 'Tiếng Anh'], rewards: ['Bút chì màu', 'Sổ tay'] }

describe('matchIntent: sĩ số lớp và cô chủ nhiệm', () => {
  it('nhận nhiều cách hỏi sĩ số, kể cả câu có chữ "sao" nghĩa tại sao', () => {
    for (const q of ['sĩ số lớp là bao nhiêu', 'sỉ số lớp', 'lớp có bao nhiêu học sinh', 'lớp mình có bao nhiêu bạn', 'tổng số học sinh']) {
      expect(matchIntent(q, [])).toEqual({ intent: 'class_size' })
    }
    expect(matchIntent('sao tôi hỏi sỉ số lớp là bao nhiêu', [])).toEqual({ intent: 'class_size' })
  })
  it('cô chủ nhiệm', () => {
    expect(matchIntent('cô chủ nhiệm tên gì', [])).toEqual({ intent: 'teacher_name' })
    expect(matchIntent('giáo viên chủ nhiệm là ai', [])).toEqual({ intent: 'teacher_name' })
  })
})

describe('matchIntent: tổng sao cả lớp', () => {
  it('tuần mặc định, tháng khi nêu', () => {
    expect(matchIntent('tổng sao cả lớp tuần này', [])).toEqual({ intent: 'class_stars', period: 'week' })
    expect(matchIntent('cả lớp được bao nhiêu sao tháng này', [])).toEqual({ intent: 'class_stars', period: 'month' })
  })
  it('không nhầm với hỏi ai cao sao nhất cả lớp', () => {
    expect(matchIntent('ai cao sao nhất cả lớp', [])).toEqual({ intent: 'top_stars', period: 'year', limit: 3 })
  })
})

describe('matchIntent: quà', () => {
  it('liệt kê quà', () => {
    expect(matchIntent('đang có quà gì', [], catalog)).toEqual({ intent: 'rewards' })
    expect(matchIntent('còn mấy phần quà', [], catalog)).toEqual({ intent: 'rewards' })
  })
  it('nhận ra tên quà cụ thể', () => {
    expect(matchIntent('sổ tay giá bao nhiêu quà', [], catalog)).toEqual({ intent: 'rewards', name: 'Sổ tay' })
    expect(matchIntent('quà bút chì màu cần bao nhiêu sao', [], catalog)).toEqual({ intent: 'rewards', name: 'Bút chì màu' })
  })
})

describe('matchIntent: số tiết mỗi môn', () => {
  it('hỏi số tiết một môn', () => {
    expect(matchIntent('tuần này có bao nhiêu tiết Toán', [], catalog)).toEqual({ intent: 'subject_periods', subject: 'Toán' })
    expect(matchIntent('Tiếng Việt học mấy tiết', [], catalog)).toEqual({ intent: 'subject_periods', subject: 'Tiếng Việt' })
  })
  it('không nêu môn thì liệt kê cả tuần', () => {
    expect(matchIntent('một tuần có bao nhiêu tiết', [], catalog)).toEqual({ intent: 'subject_periods' })
  })
  it('hỏi số tiết của một ngày vẫn là thời khóa biểu', () => {
    expect(matchIntent('hôm nay có mấy tiết', [], catalog)).toEqual({ intent: 'timetable', day: 'today' })
    expect(matchIntent('thứ ba có bao nhiêu tiết', [], catalog)).toEqual({ intent: 'timetable', day: 2 })
  })
})

describe('matchIntent: siết luật hỏi sao', () => {
  it('chữ "sao" nghĩa tại sao không bị hiểu là hỏi số sao', () => {
    expect(matchIntent('sao hôm nay không học', [])).toEqual({ intent: 'timetable', day: 'today' })
    expect(matchIntent('sao tôi hỏi mà không ai trả lời', [])).toBeNull()
  })
})

describe('needsCatalog', () => {
  it('chỉ cần tải danh sách môn và quà khi câu hỏi có liên quan', () => {
    expect(needsCatalog('một tuần có bao nhiêu tiết Toán')).toBe(true)
    expect(needsCatalog('đang có quà gì')).toBe(true)
    expect(needsCatalog('ai cao sao nhất')).toBe(false)
  })
})
