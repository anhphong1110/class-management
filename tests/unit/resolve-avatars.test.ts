import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const createSignedUrls = vi.fn()
const inFn = vi.fn()
const from = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    from,
    storage: { from: () => ({ createSignedUrls }) },
  }),
}))

import { clearSignedAvatarCache, resolveAvatars } from '@/lib/avatars/resolve'

beforeEach(() => {
  clearSignedAvatarCache()
  vi.clearAllMocks()
  inFn.mockResolvedValue({
    data: [
      { id: 'a', kind: 'preset', preset: 'fox', image_path: null },
      { id: 'b', kind: 'preset', preset: 'owl', image_path: null },
      { id: 'c', kind: 'upload', preset: null, image_path: 'x/c.png' },
    ],
  })
  from.mockReturnValue({ select: () => ({ in: inFn }) })
  createSignedUrls.mockResolvedValue({ data: [{ path: 'x/c.png', signedUrl: 'https://signed/c' }] })
})

describe('resolveAvatars', () => {
  it('batches one query and one signing call', async () => {
    const map = await resolveAvatars(['a', 'b', 'c', null, 'a'])
    expect(from).toHaveBeenCalledTimes(1)
    expect(inFn).toHaveBeenCalledWith('id', ['a', 'b', 'c'])
    expect(createSignedUrls).toHaveBeenCalledTimes(1)
    expect(createSignedUrls).toHaveBeenCalledWith(['x/c.png'], 3600)
    expect(map.get('a')).toEqual({ kind: 'preset', preset: 'fox' })
    expect(map.get('c')).toEqual({ kind: 'upload', url: 'https://signed/c' })
  })
  it('skips queries when no ids', async () => {
    const map = await resolveAvatars([null])
    expect(from).not.toHaveBeenCalled()
    expect(map.size).toBe(0)
  })
  it('logs and still returns the default avatar when signing fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    createSignedUrls.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const map = await resolveAvatars(['c'])
    expect(map.get('c')).toBeNull()
    expect(spy).toHaveBeenCalledWith('signAvatarPaths: createSignedUrls failed', 'boom')
    spy.mockRestore()
  })
})
