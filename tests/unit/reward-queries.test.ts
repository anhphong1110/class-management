import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const createSignedUrls = vi.fn()
const tables: Record<string, { data: unknown; error: unknown }> = {}
const calls: { table: string; method: string; args: unknown[] }[] = []

function chain(table: string): unknown {
  const c: unknown = new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') return (res: (v: unknown) => unknown) => res(tables[table])
      return (...args: unknown[]) => {
        calls.push({ table, method: String(prop), args })
        return c
      }
    },
  })
  return c
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    from: (t: string) => chain(t),
    storage: { from: () => ({ createSignedUrls }) },
  }),
}))
vi.mock('@/lib/avatars/resolve', async () => {
  const actual = await vi.importActual<typeof import('@/lib/avatars/resolve')>('@/lib/avatars/resolve')
  return { ...actual, resolveAvatars: async () => new Map([['av1', { kind: 'preset', preset: 'fox' }]]) }
})

import { getRewardRequests, getRewards } from '@/lib/rewards/queries'
import { clearSignedAvatarCache } from '@/lib/avatars/resolve'

const reward = (o: Record<string, unknown>) => ({
  id: 'r', name: 'Q', cost: 10, description: '', image_path: null, icon: 'star', stock: 5, hidden: false, ...o,
})

beforeEach(() => {
  clearSignedAvatarCache()
  vi.clearAllMocks()
  calls.length = 0
  for (const k of Object.keys(tables)) delete tables[k]
  createSignedUrls.mockResolvedValue({ data: [
    { path: 'c/rewards/a.png', signedUrl: 'https://s/a' },
    { path: 'c/rewards/b.png', signedUrl: 'https://s/b' },
  ] })
})

describe('getRewards', () => {
  beforeEach(() => {
    tables.rewards = { error: null, data: [
      reward({ id: 'r1', stock: 5 }),
      reward({ id: 'r2', stock: 1, hidden: true, icon: 'pen' }),
      reward({ id: 'r3', stock: 2, image_path: 'c/rewards/a.png', icon: null }),
      reward({ id: 'r4', stock: 2, image_path: 'c/rewards/b.png', icon: 'gift' }),
    ] }
    tables.reward_requests = { error: null, data: [
      { reward_id: 'r1' }, { reward_id: 'r1' }, { reward_id: 'r3' }, { reward_id: 'r3' }, { reward_id: 'r3' },
    ] }
  })

  it('left = stock - held (không âm), held đếm yêu cầu pending', async () => {
    const list = await getRewards('c', { includeHidden: true })
    const by = Object.fromEntries(list.map((r) => [r.id, r]))
    expect(by.r1).toMatchObject({ stock: 5, held: 2, left: 3 })
    expect(by.r2).toMatchObject({ held: 0, left: 1 })
    expect(by.r3).toMatchObject({ stock: 2, held: 3, left: 0 })
  })

  it('lọc quà ẩn khi includeHidden = false', async () => {
    const list = await getRewards('c', { includeHidden: false })
    expect(list.map((r) => r.id)).toEqual(['r1', 'r3', 'r4'])
  })

  it('ký ảnh bằng một lần createSignedUrls; ảnh ưu tiên hơn icon', async () => {
    const list = await getRewards('c', { includeHidden: true })
    expect(createSignedUrls).toHaveBeenCalledTimes(1)
    expect(createSignedUrls.mock.calls[0][0]).toEqual(['c/rewards/a.png', 'c/rewards/b.png'])
    const by = Object.fromEntries(list.map((r) => [r.id, r]))
    expect(by.r1.visual).toEqual({ kind: 'preset', key: 'star' })
    expect(by.r3.visual).toEqual({ kind: 'image', url: 'https://s/a' })
    expect(by.r4.visual).toEqual({ kind: 'image', url: 'https://s/b' })
  })

  it('quà không có ảnh lẫn icon dùng preset star', async () => {
    tables.rewards.data = [reward({ id: 'x', icon: null })]
    const [r] = await getRewards('c', { includeHidden: true })
    expect(r.visual).toEqual({ kind: 'preset', key: 'star' })
    expect(createSignedUrls).not.toHaveBeenCalled()
  })

  it('báo lỗi truy vấn', async () => {
    tables.rewards = { data: null, error: { message: 'boom' } }
    await expect(getRewards('c', { includeHidden: true })).rejects.toThrow('boom')
  })
})

describe('getRewardRequests', () => {
  const row = (id: string, status: string, createdAt: string, archived = false) => ({
    id, student_id: 's' + id, cost: 10, status, created_at: createdAt,
    students: { full_name: 'HS ' + id, avatar_id: 'av1', archived_at: archived ? '2026-01-01' : null },
    rewards: { name: 'Quà ' + id },
  })

  it('pending trước, rồi mới nhất trước; gồm học sinh đã lưu trữ', async () => {
    tables.reward_requests = { error: null, data: [
      row('1', 'delivered', '2026-10-30T10:00:00Z'),
      row('2', 'pending', '2026-10-28T10:00:00Z'),
      row('3', 'approved', '2026-10-31T10:00:00Z', true),
      row('4', 'pending', '2026-10-29T10:00:00Z'),
    ] }
    const list = await getRewardRequests('c')
    expect(list.map((r) => r.id)).toEqual(['4', '2', '3', '1'])
    expect(list[0]).toMatchObject({
      studentId: 's4', studentName: 'HS 4', rewardName: 'Quà 4', cost: 10, status: 'pending',
      avatar: { kind: 'preset', preset: 'fox' },
    })
  })

  it('báo lỗi truy vấn', async () => {
    tables.reward_requests = { data: null, error: { message: 'boom' } }
    await expect(getRewardRequests('c')).rejects.toThrow('boom')
  })
})
