import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

type Call = { kind: 'from' | 'select' | 'rpc'; name: string }
const calls: Call[] = []
const tables: Record<string, unknown> = {}
const rpcs: Record<string, unknown> = {}

function chain(table: string): unknown {
  const c: unknown = new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') return (res: (v: unknown) => unknown) => res(tables[table] ?? { data: null, error: null })
      return (...args: unknown[]) => {
        if (prop === 'select') calls.push({ kind: 'select', name: `${table}:${String(args[0])}` })
        return c
      }
    },
  })
  return c
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    from: (t: string) => {
      calls.push({ kind: 'from', name: t })
      return chain(t)
    },
    rpc: async (name: string) => {
      calls.push({ kind: 'rpc', name })
      return rpcs[name] ?? { data: null, error: null }
    },
  }),
}))

vi.mock('@/lib/timetable/queries', () => ({
  getTimetable: async () => ({
    subjects: [
      { id: 's1', name: 'Toán', color: 'blue', sortOrder: 1, usedCount: 5 },
      { id: 's2', name: 'Tiếng Việt', color: 'pink', sortOrder: 2, usedCount: 2 },
    ],
    slots: { '1-morning-1': 's1', '1-morning-2': 's2', '2-morning-1': 's1' },
    saturday: false,
  }),
}))

import { buildClassFacts, renderFacts, type ClassFacts } from '@/lib/chat/facts'
import type { SessionUser } from '@/lib/domain/types'

const teacher: SessionUser = { userId: 'u1', role: 'teacher', classId: 'c1', displayName: 'Cô Khanh', studentId: null, avatarId: null }
const student: SessionUser = { userId: 'u2', role: 'student', classId: 'c1', displayName: 'Nguyễn Minh Anh', studentId: 's9', avatarId: null }
const all = { timetable: true, rank: true, rewards: true }
const monday = new Date('2026-11-09T03:00:00Z')

beforeEach(() => {
  calls.length = 0
  tables.classes = {
    data: {
      class_name: '5/8',
      school_name: 'Trường Tiểu học Chính Nghĩa',
      school_year: '2026-2027',
      term1_start: '2026-09-05',
      term1_end: '2027-01-15',
      term2_start: '2027-01-18',
      term2_end: '2027-05-25',
    },
    error: null,
  }
  tables.students = { data: null, error: null, count: 35 }
  rpcs.reward_availability = { data: [{ name: 'Bút chì màu', cost: 20, left_count: 5 }, { name: 'Sổ tay', cost: 35, left_count: 0 }], error: null }
  rpcs.class_star_totals_between = { data: [{ awarded: 86, penalized: 4 }], error: null }
  rpcs.my_profile_summary = { data: [{ class_size: 35 }], error: null }
})

describe('renderFacts', () => {
  const facts: ClassFacts = {
    today: 'Thứ Hai, 09/11/2026',
    className: '5/8',
    schoolName: 'Trường Tiểu học Chính Nghĩa',
    schoolYear: '2026-2027',
    terms: { term1Start: '2026-09-05', term1End: '2027-01-15', term2Start: null, term2End: null },
    classSize: 35,
    timetable: {
      slots: { '1-morning-1': 's1', '1-morning-2': 's2' },
      subjects: [
        { id: 's1', name: 'Toán', usedCount: 5 },
        { id: 's2', name: 'Tiếng Việt', usedCount: 8 },
      ],
      saturday: false,
    },
    rewards: [
      { name: 'Bút chì màu', cost: 20, left: 5 },
      { name: 'Sổ tay', cost: 35, left: 0 },
    ],
    weekStars: { awarded: 86, penalized: 4 },
  }

  it('dựng đủ các phần theo thứ tự dễ đọc', () => {
    expect(renderFacts(facts)).toBe(
      [
        'Hôm nay: Thứ Hai, 09/11/2026.',
        'Lớp 5/8, Trường Tiểu học Chính Nghĩa, năm học 2026-2027.',
        'Học kỳ 1: 05/09/2026 đến 15/01/2027.',
        'Sĩ số: 35 học sinh.',
        'Số tiết mỗi tuần: Toán 5, Tiếng Việt 8.',
        'Thời khóa biểu:',
        'Thứ Hai: Sáng: Tiết 1 Toán, Tiết 2 Tiếng Việt',
        'Quà: Bút chì màu (20 sao, còn 5); Sổ tay (35 sao, hết).',
        'Tuần này cả lớp được cộng 86 sao và bị trừ 4 sao.',
      ].join('\n'),
    )
  })

  it('bỏ phần thiếu dữ liệu hoặc không được xem', () => {
    const out = renderFacts({ ...facts, classSize: null, timetable: null, rewards: null, weekStars: null, terms: { term1Start: null, term1End: null, term2Start: null, term2End: null } })
    expect(out).toBe('Hôm nay: Thứ Hai, 09/11/2026.\nLớp 5/8, Trường Tiểu học Chính Nghĩa, năm học 2026-2027.')
  })

  it('không có quà thì ghi rõ để model không đoán', () => {
    expect(renderFacts({ ...facts, rewards: [] })).toContain('Quà: hiện chưa có quà nào.')
  })
})

describe('buildClassFacts', () => {
  it('giáo viên: đủ mọi phần, đúng số liệu', async () => {
    const out = await buildClassFacts(teacher, all, monday)
    expect(out).toContain('Hôm nay: Thứ Hai, 09/11/2026.')
    expect(out).toContain('Lớp 5/8, Trường Tiểu học Chính Nghĩa, năm học 2026-2027.')
    expect(out).toContain('Sĩ số: 35 học sinh.')
    expect(out).toContain('Số tiết mỗi tuần: Toán 5, Tiếng Việt 2.')
    expect(out).toContain('Sổ tay (35 sao, hết)')
    expect(out).toContain('Tuần này cả lớp được cộng 86 sao và bị trừ 4 sao.')
  })

  it('không bao giờ đọc tên cô giáo hay tên học sinh', async () => {
    await buildClassFacts(teacher, all, monday)
    await buildClassFacts(student, all, monday)
    const selects = calls.filter((c) => c.kind === 'select').map((c) => c.name)
    expect(selects.some((s) => s.includes('teacher_name'))).toBe(false)
    expect(selects.some((s) => s.includes('full_name'))).toBe(false)
    expect(selects.some((s) => s.startsWith('classes:'))).toBe(true)
  })

  it('học sinh: không có tổng sao, sĩ số lấy từ hồ sơ của em', async () => {
    const out = await buildClassFacts(student, all, monday)
    expect(out).not.toContain('cả lớp được cộng')
    expect(out).toContain('Sĩ số: 35 học sinh.')
    expect(calls.some((c) => c.kind === 'rpc' && c.name === 'class_star_totals_between')).toBe(false)
  })

  it('học sinh bị tắt thời khóa biểu và quà thì không đọc hai phần đó', async () => {
    const out = await buildClassFacts(student, { timetable: false, rank: true, rewards: false }, monday)
    expect(out).not.toContain('Thời khóa biểu')
    expect(out).not.toContain('Quà:')
    expect(calls.some((c) => c.kind === 'rpc' && c.name === 'reward_availability')).toBe(false)
  })

  it('một phần lỗi thì bỏ phần đó, các phần còn lại vẫn có', async () => {
    rpcs.reward_availability = { data: null, error: { message: 'boom' } }
    const out = await buildClassFacts(teacher, all, monday)
    expect(out).not.toContain('Quà:')
    expect(out).toContain('Sĩ số: 35 học sinh.')
  })
})
