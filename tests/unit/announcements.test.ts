import { describe, expect, it } from 'vitest'
import { ANNOUNCEMENT_COLORS, ANNOUNCEMENT_TYPES, announcementInput } from '@/lib/announcements/types'

describe('announcementInput', () => {
  const ok = { title: ' Ôn tập Toán ', body: 'Trang 45', type: 'Nhắc bài', pinned: true }

  it('cắt khoảng trắng và nhận dữ liệu hợp lệ', () => {
    const r = announcementInput.safeParse(ok)
    expect(r.success && r.data.title).toBe('Ôn tập Toán')
  })

  it('từ chối tiêu đề hoặc nội dung rỗng, quá dài', () => {
    expect(announcementInput.safeParse({ ...ok, title: '  ' }).success).toBe(false)
    expect(announcementInput.safeParse({ ...ok, body: '' }).success).toBe(false)
    expect(announcementInput.safeParse({ ...ok, title: 'a'.repeat(121) }).success).toBe(false)
    expect(announcementInput.safeParse({ ...ok, body: 'a'.repeat(2001) }).success).toBe(false)
  })

  it('từ chối loại ngoài danh sách và id không phải guid', () => {
    expect(announcementInput.safeParse({ ...ok, type: 'Khác' }).success).toBe(false)
    expect(announcementInput.safeParse({ ...ok, id: 'x' }).success).toBe(false)
  })
})

describe('ANNOUNCEMENT_TYPES', () => {
  it('có 5 loại, mỗi loại một cặp màu', () => {
    expect(ANNOUNCEMENT_TYPES).toHaveLength(5)
    for (const t of ANNOUNCEMENT_TYPES) expect(ANNOUNCEMENT_COLORS[t]).toHaveLength(2)
  })
})
