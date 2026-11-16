import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let pathname = '/'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))

import { ChatWidget } from '@/components/chat/ChatWidget'

const FAB = 'Mở khung chat với Bông'

describe('ChatWidget: ẩn ở trang Kho học liệu', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ role: null, theme: null, suggestions: [] }))))
  })

  it.each(['/tong-quan', '/em', '/dang-nhap'])('hiện nút chat ở %s', (p) => {
    pathname = p
    render(<ChatWidget />)
    expect(screen.getByRole('button', { name: FAB })).toBeTruthy()
  })

  it.each(['/kho-hoc-lieu', '/em/kho-hoc-lieu'])('ẩn nút chat ở %s', (p) => {
    pathname = p
    render(<ChatWidget />)
    expect(screen.queryByRole('button', { name: FAB })).toBeNull()
  })
})
