import { describe, expect, it } from 'vitest'
import { shouldConfirmLeave } from '@/lib/attendance/leave-guard'

const u = (path: string) => new URL(path, 'http://localhost')
const TODAY = '2026-11-02'

describe('shouldConfirmLeave', () => {
  it('đổi ngày thì hỏi', () => {
    expect(shouldConfirmLeave(u('/diem-danh?ngay=2026-10-30'), u('/diem-danh?ngay=2026-11-01'), TODAY)).toBe(true)
  })
  it('chỉ đổi tháng của lịch (cùng ngày) thì không hỏi', () => {
    expect(shouldConfirmLeave(u('/diem-danh?ngay=2026-11-01&thang=2026-10'), u('/diem-danh?ngay=2026-11-01'), TODAY)).toBe(false)
  })
  it('thiếu ?ngay tính là hôm nay', () => {
    expect(shouldConfirmLeave(u('/diem-danh?ngay=2026-11-02'), u('/diem-danh'), TODAY)).toBe(false)
    expect(shouldConfirmLeave(u('/diem-danh'), u('/diem-danh?ngay=2026-11-01'), TODAY)).toBe(true)
  })
  it('sang trang khác thì hỏi', () => {
    expect(shouldConfirmLeave(u('/hoc-sinh'), u('/diem-danh'), TODAY)).toBe(true)
  })
  it('bấm kèm Ctrl/Cmd/Shift hoặc chuột giữa thì không hỏi', () => {
    expect(shouldConfirmLeave(u('/hoc-sinh'), u('/diem-danh'), TODAY, { ctrlKey: true })).toBe(false)
    expect(shouldConfirmLeave(u('/hoc-sinh'), u('/diem-danh'), TODAY, { metaKey: true })).toBe(false)
    expect(shouldConfirmLeave(u('/hoc-sinh'), u('/diem-danh'), TODAY, { shiftKey: true })).toBe(false)
    expect(shouldConfirmLeave(u('/hoc-sinh'), u('/diem-danh'), TODAY, { button: 1 })).toBe(false)
  })
})
