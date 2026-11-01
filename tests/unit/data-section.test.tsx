import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/(teacher)/cai-dat/data-actions', () => ({
  deleteDemoData: vi.fn(),
  openNewYear: vi.fn(),
  restoreBackup: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/lib/supabase/client', () => ({ createBrowserSupabase: vi.fn() }))

import { DataSection } from '@/app/(teacher)/cai-dat/DataSection'

afterEach(cleanup)

const current = { schoolYear: '2026 – 2027', className: '5A', teacherName: 'Cô Khanh' }
const view = (demoCount: number) =>
  render(<DataSection archived={[]} classId="00000000-0000-0000-0000-000000000058" current={current} demoCount={demoCount} />)

describe('DataSection: Xóa dữ liệu demo', () => {
  it('không còn dữ liệu demo thì nút bị khóa và có gợi ý', () => {
    view(0)
    const button = screen.getByRole('button', { name: /^Xóa dữ liệu demo/ }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.textContent).toContain('Không còn dữ liệu demo.')
  })

  it('còn dữ liệu demo thì nút mở được, hint nêu số học sinh', () => {
    view(10)
    const button = screen.getByRole('button', { name: /^Xóa dữ liệu demo/ }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    expect(button.textContent).toContain('Xóa 10 học sinh mẫu để nhập danh sách thật. Cần xác nhận.')
  })
})
