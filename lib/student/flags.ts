import { ICONS } from '@/components/ui/Icon'

export type StudentPageId = 'home' | 'stars' | 'rank' | 'gifts' | 'tt' | 'att' | 'news' | 'hub'

export type StudentNavItem = { id: StudentPageId; label: string; href: string; icon: string }

/** Nhãn và path SVG chép từ design/project/Student.dc.html (NAV). */
export const STUDENT_NAV: StudentNavItem[] = [
  { id: 'home', label: 'Trang chủ', href: '/em', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  { id: 'stars', label: 'Sao của em', href: '/em/sao', icon: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' },
  { id: 'rank', label: 'Bảng xếp hạng', href: '/em/xep-hang', icon: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3' },
  { id: 'gifts', label: 'Đổi quà', href: '/em/doi-qua', icon: 'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z' },
  { id: 'tt', label: 'Thời khóa biểu', href: '/em/thoi-khoa-bieu', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
  { id: 'att', label: 'Điểm danh của em', href: '/em/diem-danh', icon: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9' },
  { id: 'news', label: 'Thông báo', href: '/em/thong-bao', icon: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0' },
  { id: 'hub', label: 'Kho học liệu', href: '/em/kho-hoc-lieu', icon: ICONS.book },
]

/** Tiêu đề trang ở thanh trên, chép từ TITLES của thiết kế. */
export const STUDENT_TITLES: Record<StudentPageId, string> = {
  home: 'Trang chủ',
  stars: 'Sao của em',
  rank: 'Bảng xếp hạng',
  gifts: 'Trạm đổi quà vũ trụ',
  tt: 'Lịch bay của phi hành gia',
  att: 'Điểm danh của em',
  news: 'Tín hiệu từ trạm chỉ huy',
  hub: 'Kho học liệu',
}

/** Các cờ trong class_settings mà cổng học sinh đọc. */
export type StudentSettings = {
  feature_rewards: boolean
  feature_missions: boolean
  student_can_view_history: boolean
  student_can_view_rank: boolean
  student_can_view_rewards: boolean
  student_can_view_timetable: boolean
  student_can_view_attendance: boolean
  student_can_view_news: boolean
  student_can_change_avatar: boolean
}

export const STUDENT_SETTING_COLUMNS =
  'feature_rewards, feature_missions, student_can_view_history, student_can_view_rank, student_can_view_rewards, student_can_view_timetable, student_can_view_attendance, student_can_view_news, student_can_change_avatar'

export function visibleStudentPages(s: StudentSettings): Set<StudentPageId> {
  const pages = new Set<StudentPageId>(['home', 'hub'])
  if (s.student_can_view_history) pages.add('stars')
  if (s.student_can_view_rank) pages.add('rank')
  if (s.feature_rewards && s.student_can_view_rewards) pages.add('gifts')
  if (s.student_can_view_timetable) pages.add('tt')
  if (s.student_can_view_attendance) pages.add('att')
  if (s.student_can_view_news) pages.add('news')
  return pages
}
