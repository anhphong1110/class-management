import { describe, expect, it } from 'vitest'
import {
  formatClassSize,
  formatClassStars,
  formatMyStars,
  formatRewards,
  formatStudentStars,
  formatSubjectPeriods,
  formatTeacherName,
  formatTimetableReply,
  formatTopStars,
} from '@/lib/chat/format'

describe('formatClassSize / formatTeacherName', () => {
  it('sĩ số', () => {
    expect(formatClassSize(35)).toBe('Lớp mình hiện có 35 học sinh.')
  })
  it('cô chủ nhiệm, không lặp chữ "cô"', () => {
    expect(formatTeacherName('Nguyễn Mai Khanh')).toBe('Cô chủ nhiệm lớp mình là cô Nguyễn Mai Khanh.')
    expect(formatTeacherName('Cô Mai Khanh')).toBe('Cô chủ nhiệm lớp mình là cô Mai Khanh.')
    expect(formatTeacherName('  ')).toBeNull()
  })
})

describe('formatClassStars', () => {
  it('tổng cộng và trừ của tuần hoặc tháng', () => {
    expect(formatClassStars('week', { awarded: 86, penalized: 4 })).toBe('Tuần này cả lớp được cộng 86 sao và bị trừ 4 sao.')
    expect(formatClassStars('month', { awarded: 0, penalized: 0 })).toBe('Tháng này cả lớp được cộng 0 sao và bị trừ 0 sao.')
  })
})

describe('formatRewards', () => {
  const rewards = [
    { name: 'Bút chì màu', cost: 20, left: 5 },
    { name: 'Sổ tay', cost: 35, left: 0 },
  ]
  it('liệt kê, quà hết thì ghi hết', () => {
    expect(formatRewards(rewards)).toBe('Các phần quà đang có:\n- Bút chì màu · 20 sao · còn 5\n- Sổ tay · 35 sao · hết')
  })
  it('một món cụ thể', () => {
    expect(formatRewards(rewards, 'Bút chì màu')).toBe('Bút chì màu cần 20 sao, còn 5 phần.')
    expect(formatRewards(rewards, 'Sổ tay')).toBe('Sổ tay cần 35 sao, hiện đã hết.')
  })
  it('chưa có quà nào', () => {
    expect(formatRewards([])).toBe('Hiện lớp chưa có quà nào để đổi.')
  })
  it('liệt kê tối đa 10 món', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ name: `Quà ${i + 1}`, cost: 10, left: 1 }))
    const out = formatRewards(many).split('\n')
    expect(out).toHaveLength(12)
    expect(out[11]).toBe('…và 2 món nữa.')
  })
})

describe('formatSubjectPeriods', () => {
  const subjects = [
    { name: 'Toán', usedCount: 5 },
    { name: 'Tiếng Việt', usedCount: 8 },
    { name: 'Mĩ thuật', usedCount: 0 },
  ]
  it('một môn', () => {
    expect(formatSubjectPeriods(subjects, 'Toán')).toBe('Toán học 5 tiết mỗi tuần.')
    expect(formatSubjectPeriods(subjects, 'Mĩ thuật')).toBe('Mĩ thuật chưa có tiết nào trong tuần.')
  })
  it('môn không có trong lớp', () => {
    expect(formatSubjectPeriods(subjects, 'Võ')).toBe('Mình không thấy môn Võ trong thời khóa biểu.')
  })
  it('cả tuần, bỏ môn không có tiết, kèm tổng', () => {
    expect(formatSubjectPeriods(subjects)).toBe('Số tiết mỗi tuần:\n- Toán: 5 tiết\n- Tiếng Việt: 8 tiết\nTổng cộng 13 tiết.')
  })
  it('thời khóa biểu trống', () => {
    expect(formatSubjectPeriods([{ name: 'Toán', usedCount: 0 }])).toBe('Thời khóa biểu chưa có tiết nào.')
  })
})

const subjects = [
  { id: 's1', name: 'Toán', color: 'blue' },
  { id: 's2', name: 'Tiếng Việt', color: 'pink' },
  { id: 's3', name: 'Tiếng Anh', color: 'mint' },
]
// Thứ Hai (1): sáng tiết 1 Toán, tiết 2 Tiếng Việt, chiều tiết 1 Tiếng Anh. Tiết 3 sáng trỏ tới môn đã xóa.
const slots: Record<string, string | null> = {
  '1-morning-1': 's1',
  '1-morning-2': 's2',
  '1-morning-3': 'gone',
  '1-afternoon-1': 's3',
  '2-morning-1': null,
}
const tt = { slots, subjects, saturday: false }
// 2026-11-09 là Thứ Hai.
const monday = new Date('2026-11-09T03:00:00Z')

describe('formatTimetableReply', () => {
  it('hôm nay có tiết, chia sáng và chiều, bỏ ô trống và môn đã xóa', () => {
    expect(formatTimetableReply('today', monday, tt)).toBe(
      'Hôm nay (Thứ Hai, 09/11/2026) lớp mình học:\nSáng: Tiết 1 Toán, Tiết 2 Tiếng Việt\nChiều: Tiết 1 Tiếng Anh',
    )
  })
  it('ngày mai nhưng chưa nhập thời khóa biểu', () => {
    expect(formatTimetableReply('tomorrow', monday, tt)).toBe('Ngày mai (Thứ Ba, 10/11/2026) chưa có tiết nào trong thời khóa biểu.')
  })
  it('một thứ cụ thể không kèm ngày', () => {
    expect(formatTimetableReply(1, monday, tt)).toBe(
      'Thứ Hai lớp mình học:\nSáng: Tiết 1 Toán, Tiết 2 Tiếng Việt\nChiều: Tiết 1 Tiếng Anh',
    )
  })
  it('chỉ có buổi sáng thì không in dòng chiều', () => {
    const only = { slots: { '1-morning-1': 's1' }, subjects, saturday: false }
    expect(formatTimetableReply(1, monday, only)).toBe('Thứ Hai lớp mình học:\nSáng: Tiết 1 Toán')
  })
  it('Chủ Nhật nghỉ', () => {
    expect(formatTimetableReply(0, monday, tt)).toBe('Chủ Nhật lớp mình được nghỉ, không có tiết học.')
  })
  it('Thứ Bảy tắt thì không học, bật thì đọc thời khóa biểu', () => {
    expect(formatTimetableReply(6, monday, tt)).toBe('Thứ Bảy lớp mình không học.')
    expect(formatTimetableReply(6, monday, { ...tt, saturday: true })).toBe('Thứ Bảy chưa có tiết nào trong thời khóa biểu.')
  })
})

describe('formatTopStars', () => {
  const rows = [
    { full_name: 'Minh Anh', stars: 42, rank: 1 },
    { full_name: 'Gia Huy', stars: '38', rank: '2' },
    { full_name: 'Bảo Ngọc', stars: 35, rank: 3 },
    { full_name: 'Quốc Huy', stars: 20, rank: 4 },
  ]
  it('lấy các bạn trong top, nhận số dạng chuỗi', () => {
    expect(formatTopStars('week', rows, 3)).toBe('Tuần này dẫn đầu:\n1. Minh Anh · 42 sao\n2. Gia Huy · 38 sao\n3. Bảo Ngọc · 35 sao')
  })
  it('đồng hạng thì cùng được liệt kê', () => {
    const tie = [
      { full_name: 'A', stars: 10, rank: 1 },
      { full_name: 'B', stars: 10, rank: 1 },
      { full_name: 'C', stars: 9, rank: 3 },
    ]
    expect(formatTopStars('year', tie, 1)).toBe('Cả năm dẫn đầu:\n1. A · 10 sao\n1. B · 10 sao')
  })
  it('chưa ai có sao hoặc danh sách rỗng', () => {
    expect(formatTopStars('month', [{ full_name: 'A', stars: 0, rank: 1 }], 3)).toBe('Tháng này chưa có bạn nào có sao.')
    expect(formatTopStars('month', [], 3)).toBe('Chưa có bảng xếp hạng để xem.')
  })
})

describe('formatMyStars', () => {
  it('đủ số liệu và hạng', () => {
    expect(formatMyStars({ competition: 30, available: 12, rank: 4, classSize: 35 })).toBe(
      'Bạn có 30 sao thi đua và 12 sao có thể đổi quà. Cả năm bạn đứng hạng 4/35.',
    )
  })
  it('cô đang ẩn số liệu thi đua và hạng', () => {
    expect(formatMyStars({ competition: null, available: 12, rank: null, classSize: null })).toBe('Bạn có 12 sao có thể đổi quà.')
  })
})

describe('formatStudentStars', () => {
  it('một bạn', () => {
    expect(formatStudentStars([{ fullName: 'Gia Huy', competition: 38, available: 20 }])).toBe(
      'Gia Huy có 38 sao thi đua và 20 sao có thể đổi quà.',
    )
  })
  it('nhiều bạn trùng tên thì liệt kê để cô chọn', () => {
    expect(
      formatStudentStars([
        { fullName: 'Trần Gia Huy', competition: 38, available: 20 },
        { fullName: 'Phạm Quốc Huy', competition: 20, available: 5 },
      ]),
    ).toBe('Có 2 bạn phù hợp:\n- Trần Gia Huy: 38 sao thi đua, 20 sao đổi quà\n- Phạm Quốc Huy: 20 sao thi đua, 5 sao đổi quà')
  })
  it('không có bạn nào', () => {
    expect(formatStudentStars([])).toBe('Mình không tìm thấy bạn nào có tên đó trong lớp.')
  })
})
