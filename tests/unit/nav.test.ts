import { describe, expect, it } from 'vitest'
import { TEACHER_NAV } from '@/components/layout/nav'

describe('TEACHER_NAV', () => {
  it('có 14 mục, nhãn đầu và cuối đúng', () => {
    expect(TEACHER_NAV).toHaveLength(14)
    expect(TEACHER_NAV[0].label).toBe('Tổng quan')
    expect(TEACHER_NAV.at(-1)!.label).toBe('Hồ sơ và avatar')
  })
  it('href là duy nhất và bắt đầu bằng /', () => {
    const hrefs = TEACHER_NAV.map((n) => n.href)
    expect(new Set(hrefs).size).toBe(14)
    expect(hrefs.every((h) => h.startsWith('/'))).toBe(true)
  })
})
