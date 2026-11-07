import { describe, expect, it } from 'vitest'
import { THEMES, themeVars } from '@/lib/domain/theme'

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('THEMES', () => {
  it('giữ đúng màu nút theo thiết kế', () => {
    expect(THEMES.indigo.strong).toBe('#2563EB')
    expect(THEMES.pink.strong).toBe('#C2407A')
    expect(THEMES.mint.strong).toBe('#12796B')
    expect(THEMES.gold.strong).toBe('#8F5A00')
  })

  it.each(Object.keys(THEMES) as (keyof typeof THEMES)[])('%s: chữ trắng trên strong đạt 4.5', (k) => {
    expect(contrast(THEMES[k].strong, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })

  it.each(Object.keys(THEMES) as (keyof typeof THEMES)[])('%s: chữ ink/deep trên nền soft đạt 4.5', (k) => {
    expect(contrast(THEMES[k].ink, THEMES[k].soft)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(THEMES[k].deep, THEMES[k].soft)).toBeGreaterThanOrEqual(4.5)
  })

  it('indigo là xanh trời với bộ màu nhạt mới', () => {
    expect(THEMES.indigo.label).toBe('Xanh trời')
    expect(THEMES.indigo.soft).toBe('#E0EEFF')
    expect(THEMES.indigo.ink).toBe('#1D4ED8')
    expect(THEMES.indigo.deep).toBe('#1E40AF')
    expect(THEMES.indigo.bg).toBe('#EEF7FF')
  })

  it.each(Object.keys(THEMES) as (keyof typeof THEMES)[])('%s: chữ ink trên nền trang đạt 4.5', (k) => {
    expect(contrast('#231F4D', THEMES[k].bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('themeVars đặt đủ biến CSS', () => {
    expect(themeVars('mint')).toEqual({
      '--primary': '#2BB5A4',
      '--primary-strong': '#12796B',
      '--primary-soft': THEMES.mint.soft,
      '--primary-ink': THEMES.mint.ink,
      '--primary-deep': THEMES.mint.deep,
      '--primary-bg': THEMES.mint.bg,
      '--primary-edge': THEMES.mint.edge,
    })
  })

  it('themeVars rơi về indigo khi tên lạ hoặc rỗng', () => {
    expect(themeVars(undefined)['--primary-strong']).toBe('#2563EB')
    expect(themeVars('xyz')['--primary-strong']).toBe('#2563EB')
  })
})
