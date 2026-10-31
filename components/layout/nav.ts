export type NavItem = { id: string; label: string; href: string; icon: string }

export const TEACHER_NAV: NavItem[] = [
  { id: 'home', label: 'Tổng quan', href: '/tong-quan', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  { id: 'students', label: 'Quản lý học sinh', href: '/hoc-sinh', icon: 'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1a4 4 0 0 0-3-3.8M16 4.2a3.5 3.5 0 0 1 0 6.6' },
  { id: 'attendance', label: 'Điểm danh', href: '/diem-danh', icon: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9' },
  { id: 'stars', label: 'Trạm thi đua', href: '/thi-dua', icon: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' },
  { id: 'rank', label: 'Bảng xếp hạng', href: '/xep-hang', icon: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3' },
  { id: 'rewards', label: 'Trạm đổi quà', href: '/doi-qua', icon: 'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z' },
  { id: 'random', label: 'Gọi tên ngẫu nhiên', href: '/goi-ten', icon: 'M4 4h16v16H4zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01' },
  { id: 'timetable', label: 'Thời khóa biểu', href: '/thoi-khoa-bieu', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
  { id: 'news', label: 'Thông báo', href: '/thong-bao', icon: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0' },
  { id: 'missions', label: 'Nhiệm vụ và huy hiệu', href: '/nhiem-vu', icon: 'M4 22V4M4 4h13l-2 4 2 4H4' },
  { id: 'display', label: 'Chế độ trình chiếu', href: '/trinh-chieu', icon: 'M3 4h18v12H3zM8 21h8M12 16v5' },
  { id: 'report', label: 'Thống kê – Báo cáo', href: '/bao-cao', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
  { id: 'settings', label: 'Cài đặt', href: '/cai-dat', icon: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M14 4v4M8 10v4M18 16v4' },
  { id: 'profile', label: 'Hồ sơ và avatar', href: '/ho-so', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
]
