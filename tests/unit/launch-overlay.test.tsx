import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LaunchOverlay } from '@/app/(auth)/dang-nhap/LaunchOverlay'

afterEach(cleanup)

describe('LaunchOverlay', () => {
  it('đang đăng nhập: phủ ngoài cùng body, báo trạng thái', () => {
    render(<LaunchOverlay show />)
    expect(screen.getByRole('status')).toHaveTextContent('Đang chuẩn bị trạm…')
    expect(screen.getByTestId('launch-overlay').parentElement).toBe(document.body)
  })
  it('không đăng nhập: không render gì', () => {
    render(<LaunchOverlay show={false} />)
    expect(screen.queryByTestId('launch-overlay')).toBeNull()
  })
})
