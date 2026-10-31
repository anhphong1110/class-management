import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/avatars/resolve', () => ({ resolveAvatars: async () => new Map() }))

// Chuỗi truy vấn giả: mọi phương thức trả lại chính nó, await ra lỗi.
function failing() {
  const result = { data: null, error: { message: 'boom' } }
  const chain: unknown = new Proxy(() => {}, {
    get: (_t, prop) => (prop === 'then' ? (res: (v: unknown) => unknown) => res(result) : chain),
    apply: () => chain,
  })
  return chain
}
vi.mock('@/lib/supabase/server', () => ({ createServerSupabase: async () => ({ from: () => failing(), rpc: () => failing() }) }))

import { getCriteria, getGroups, getStarSteps } from '@/lib/stars/queries'
import { getStudentCards } from '@/lib/students/queries'

describe('truy vấn báo lỗi thay vì trả rỗng', () => {
  it('getStarSteps', async () => {
    await expect(getStarSteps('c')).rejects.toThrow('boom')
  })
  it('getGroups', async () => {
    await expect(getGroups('c')).rejects.toThrow('boom')
  })
  it('getCriteria', async () => {
    await expect(getCriteria('c')).rejects.toThrow('boom')
  })
  it('getStudentCards', async () => {
    await expect(getStudentCards('c')).rejects.toThrow('boom')
  })
})
