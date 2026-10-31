import { z } from 'zod'

export const ANNOUNCEMENT_TYPES = ['Thông báo chung', 'Nhắc bài', 'Lịch kiểm tra', 'Hoạt động', 'Sự kiện của lớp'] as const
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number]

/** Cặp [nền, chữ] của nhãn loại, chép từ Announcements.dc.html. */
export const ANNOUNCEMENT_COLORS: Record<string, [string, string]> = {
  'Thông báo chung': ['#E8EBFF', '#2C37A8'],
  'Nhắc bài': ['#E8EBFF', '#2C37A8'],
  'Lịch kiểm tra': ['#FFE3EE', '#8E1B3B'],
  'Hoạt động': ['#DDF6F1', '#0B5A4D'],
  'Sự kiện của lớp': ['#FFF1CC', '#6E4700'],
}

export function announcementColors(type: string): [string, string] {
  return ANNOUNCEMENT_COLORS[type] ?? ANNOUNCEMENT_COLORS['Thông báo chung']
}

// guid: `z.uuid()` của Zod 4 đòi đúng phiên bản RFC, còn id seed thì không có.
export const announcementInput = z.object({
  id: z.guid().optional(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  type: z.enum(ANNOUNCEMENT_TYPES),
  pinned: z.boolean(),
})

export type AnnouncementView = {
  id: string
  type: string
  title: string
  body: string
  pinned: boolean
  publishedAt: string
  imageUrl: string | null
}
