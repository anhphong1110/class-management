import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_LEARNING_HUB_URL, getLearningHubUrl } from '@/lib/hub/config'
import { HubFrame } from '@/components/hub/HubFrame'

afterEach(cleanup)

describe('getLearningHubUrl', () => {
  it('không có biến thì dùng địa chỉ mặc định Lớp 5', () => {
    expect(DEFAULT_LEARNING_HUB_URL).toBe('https://studywithbong.netlify.app/#/khoi/5')
    expect(getLearningHubUrl(undefined)).toBe('https://studywithbong.netlify.app/#/khoi/5')
  })
  it('dùng giá trị https hợp lệ', () => {
    expect(getLearningHubUrl('https://abc.netlify.app/#/khoi/3')).toBe('https://abc.netlify.app/#/khoi/3')
  })
  it.each(['', '   ', 'not a url', 'javascript:alert(1)', 'http://insecure.example/', 'ftp://x.y/'])(
    'giá trị %j rơi về địa chỉ mặc định',
    (raw) => {
      expect(getLearningHubUrl(raw)).toBe(DEFAULT_LEARNING_HUB_URL)
    },
  )
  it('cắt khoảng trắng hai đầu', () => {
    expect(getLearningHubUrl('  https://abc.netlify.app/  ')).toBe('https://abc.netlify.app/')
  })
})

describe('HubFrame', () => {
  const url = 'https://abc.netlify.app/#/khoi/5'

  it('iframe có title, src, lazy', () => {
    render(<HubFrame url={url} />)
    const frame = screen.getByTitle('Kho học liệu')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame).toHaveAttribute('src', url)
    expect(frame).toHaveAttribute('loading', 'lazy')
  })
  it('sandbox cho game và sách lật mở tab mới bình thường nhưng không cho trang nhúng chuyển cả trang lớp', () => {
    render(<HubFrame url={url} />)
    const tokens = (screen.getByTitle('Kho học liệu').getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean)
    expect(tokens).toEqual(
      expect.arrayContaining(['allow-scripts', 'allow-same-origin', 'allow-popups', 'allow-popups-to-escape-sandbox']),
    )
    expect(tokens.some((t) => t.startsWith('allow-top-navigation'))).toBe(false)
  })
  it('luôn có nút Mở trong tab mới ngoài iframe', () => {
    render(<HubFrame url={url} />)
    const link = screen.getByRole('link', { name: 'Mở trong tab mới' })
    expect(link).toHaveAttribute('href', url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByTitle('Kho học liệu').contains(link)).toBe(false)
  })
  it('không truyền url thì dùng mặc định', () => {
    render(<HubFrame />)
    expect(screen.getByTitle('Kho học liệu')).toHaveAttribute('src', DEFAULT_LEARNING_HUB_URL)
  })
})
