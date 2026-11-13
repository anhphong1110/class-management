import { describe, expect, it } from 'vitest'
import { STUDENT_NAV, STUDENT_TITLES, visibleStudentPages, type StudentSettings } from '@/lib/student/flags'

const ALL_ON: StudentSettings = {
  feature_rewards: true,
  feature_missions: true,
  student_can_view_history: true,
  student_can_view_rank: true,
  student_can_view_rewards: true,
  student_can_view_timetable: true,
  student_can_view_attendance: true,
  student_can_view_news: true,
  student_can_change_avatar: true,
}
const ALL_OFF = Object.fromEntries(Object.keys(ALL_ON).map((k) => [k, false])) as StudentSettings

describe('STUDENT_NAV', () => {
  it('8 mục đúng thứ tự, nhãn và đường dẫn của thiết kế', () => {
    expect(STUDENT_NAV.map((n) => [n.id, n.label, n.href])).toEqual([
      ['home', 'Trang chủ', '/em'],
      ['stars', 'Sao của em', '/em/sao'],
      ['rank', 'Bảng xếp hạng', '/em/xep-hang'],
      ['gifts', 'Đổi quà', '/em/doi-qua'],
      ['tt', 'Thời khóa biểu', '/em/thoi-khoa-bieu'],
      ['att', 'Điểm danh của em', '/em/diem-danh'],
      ['news', 'Thông báo', '/em/thong-bao'],
      ['hub', 'Kho học liệu', '/em/kho-hoc-lieu'],
    ])
    expect(STUDENT_NAV.every((n) => n.icon.length > 10)).toBe(true)
  })
  it('tiêu đề trang theo thiết kế', () => {
    expect(STUDENT_TITLES).toEqual({
      home: 'Trang chủ',
      stars: 'Sao của em',
      rank: 'Bảng xếp hạng',
      gifts: 'Trạm đổi quà vũ trụ',
      tt: 'Lịch bay của phi hành gia',
      att: 'Điểm danh của em',
      news: 'Tín hiệu từ trạm chỉ huy',
      hub: 'Kho học liệu',
    })
  })
})

describe('visibleStudentPages', () => {
  it('bật hết: đủ 8 trang', () => {
    expect([...visibleStudentPages(ALL_ON)].sort()).toEqual(['att', 'gifts', 'home', 'hub', 'news', 'rank', 'stars', 'tt'])
  })
  it('tắt hết: còn home và hub', () => {
    expect([...visibleStudentPages(ALL_OFF)].sort()).toEqual(['home', 'hub'])
  })
  it('hub luôn hiện, không phụ thuộc cờ nào', () => {
    expect(visibleStudentPages(ALL_OFF).has('hub')).toBe(true)
  })
  it.each([
    ['stars', 'student_can_view_history'],
    ['rank', 'student_can_view_rank'],
    ['gifts', 'student_can_view_rewards'],
    ['tt', 'student_can_view_timetable'],
    ['att', 'student_can_view_attendance'],
    ['news', 'student_can_view_news'],
  ] as const)('%s ẩn khi tắt %s', (page, flag) => {
    const pages = visibleStudentPages({ ...ALL_ON, [flag]: false })
    expect(pages.has(page)).toBe(false)
    expect(pages.size).toBe(7)
  })
  it('gifts cần cả feature_rewards lẫn student_can_view_rewards', () => {
    expect(visibleStudentPages({ ...ALL_ON, feature_rewards: false }).has('gifts')).toBe(false)
    expect(visibleStudentPages({ ...ALL_OFF, student_can_view_rewards: true }).has('gifts')).toBe(false)
    expect(visibleStudentPages({ ...ALL_OFF, feature_rewards: true, student_can_view_rewards: true }).has('gifts')).toBe(true)
  })
  it('mỗi cờ chỉ mở đúng trang của nó', () => {
    expect([...visibleStudentPages({ ...ALL_OFF, student_can_view_rank: true })].sort()).toEqual(['home', 'hub', 'rank'])
  })
})
