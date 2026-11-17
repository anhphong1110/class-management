import { describe, expect, it } from 'vitest'
import { TEACHER_NAV, TEACHER_NAV_META } from '@/components/layout/nav'

describe('TEACHER_NAV', () => {
  it('có 15 mục, nhãn đầu và cuối đúng', () => {
    expect(TEACHER_NAV).toHaveLength(15)
    expect(TEACHER_NAV[0].label).toBe('Tổng quan')
    expect(TEACHER_NAV.at(-1)!.label).toBe('Hồ sơ và avatar')
  })
  it('href là duy nhất và bắt đầu bằng /', () => {
    const hrefs = TEACHER_NAV.map((n) => n.href)
    expect(new Set(hrefs).size).toBe(15)
    expect(hrefs.every((h) => h.startsWith('/'))).toBe(true)
  })
  it('Kho học liệu nằm sau Thống kê – Báo cáo và trước Cài đặt', () => {
    const ids = TEACHER_NAV.map((n) => n.id)
    expect(ids.indexOf('hub')).toBe(ids.indexOf('report') + 1)
    expect(ids.indexOf('settings')).toBe(ids.indexOf('hub') + 1)
    const hub = TEACHER_NAV.find((n) => n.id === 'hub')!
    expect(hub.href).toBe('/kho-hoc-lieu')
    expect(hub.label).toBe('Kho học liệu')
  })
  it('mỗi mục có nhóm và các nhóm liền nhau', () => {
    const groups = TEACHER_NAV.map((n) => {
      expect(TEACHER_NAV_META[n.id]).toBeDefined()
      return TEACHER_NAV_META[n.id].group
    })
    const runs = groups.filter((g, i) => i === 0 || g !== groups[i - 1])
    expect(new Set(runs).size).toBe(runs.length)
    expect(TEACHER_NAV_META.hub.group).toBe('Công cụ')
  })
})
