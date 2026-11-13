import { cleanup, render, screen } from '@testing-library/react'
import { useLinkStatus } from 'next/link'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ICONS } from '@/components/ui/Icon'
import { LinkPendingIcon } from '@/components/ui/LinkPendingIcon'

vi.mock('next/link', () => ({ useLinkStatus: vi.fn() }))
const status = vi.mocked(useLinkStatus)

afterEach(cleanup)

describe('LinkPendingIcon', () => {
  it('bình thường: chỉ có icon gốc', () => {
    status.mockReturnValue({ pending: false })
    const { container } = render(<LinkPendingIcon><svg data-testid="goc" /></LinkPendingIcon>)
    expect(screen.getByTestId('goc')).toBeInTheDocument()
    expect(screen.queryByText('Đang tải…')).toBeNull()
    expect(container.querySelector('.lp-new')).toBeNull()
  })

  it('đang chuyển: thêm spinner và chữ cho đọc màn hình', () => {
    status.mockReturnValue({ pending: true })
    const { container } = render(<LinkPendingIcon><svg data-testid="goc" /></LinkPendingIcon>)
    expect(container.querySelector('.lp-old')).toContainElement(screen.getByTestId('goc'))
    expect(container.querySelector(`.lp-new svg path[d="${ICONS.spinner}"]`)).not.toBeNull()
    expect(screen.getByText('Đang tải…')).toBeInTheDocument()
  })

  it('không có icon gốc: chỉ hiện spinner khi đang chuyển', () => {
    status.mockReturnValue({ pending: false })
    const idle = render(<LinkPendingIcon />)
    expect(idle.container).toBeEmptyDOMElement()
    idle.unmount()
    status.mockReturnValue({ pending: true })
    const busy = render(<LinkPendingIcon />)
    expect(busy.container.querySelector('.lp-new')).not.toBeNull()
  })
})
