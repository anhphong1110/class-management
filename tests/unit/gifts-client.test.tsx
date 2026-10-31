import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GiftView } from '@/lib/student/queries'

let release: (v: { approved?: boolean }) => void = () => {}
vi.mock('@/app/em/doi-qua/actions', () => ({
  requestReward: vi.fn(() => new Promise((resolve) => (release = resolve))),
}))
vi.mock('@/components/rewards/RewardVisual', () => ({ RewardVisual: () => null }))

import { GiftsClient } from '@/app/em/doi-qua/GiftsClient'

afterEach(cleanup)

const gifts: GiftView[] = [
  { id: 'g1', name: 'Sticker', cost: 10, description: '', left: 3, visual: { kind: 'preset', key: 'star' } },
  { id: 'g2', name: 'Bút', cost: 10, description: '', left: 3, visual: { kind: 'preset', key: 'star' } },
]

describe('GiftsClient', () => {
  it('khóa mọi nút đổi quà khi đang gửi yêu cầu, rồi mở lại', async () => {
    render(<GiftsClient gifts={gifts} available={50} reserve enforceStars preview={false} />)
    const buttons = () => screen.getAllByRole('button', { name: 'Đổi quà' })
    fireEvent.click(buttons()[0])
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))
    await vi.waitFor(() => {
      for (const b of screen.getAllByRole('button', { name: 'Đổi quà' })) expect((b as HTMLButtonElement).disabled).toBe(true)
    })
    await act(async () => release({ approved: false }))
    await vi.waitFor(() => {
      for (const b of screen.getAllByRole('button', { name: 'Đổi quà' })) expect((b as HTMLButtonElement).disabled).toBe(false)
    })
    expect(screen.getByRole('status').textContent).toContain('chờ cô duyệt')
  })

  it('đã tự duyệt thì câu thành công không nói chờ duyệt', async () => {
    render(<GiftsClient gifts={gifts} available={50} reserve enforceStars preview={false} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Đổi quà' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))
    await act(async () => release({ approved: true }))
    const status = await screen.findByRole('status')
    expect(status.textContent).toBe('Đổi quà "Sticker" thành công. Cô sẽ trao quà cho em nhé.')
  })
})
