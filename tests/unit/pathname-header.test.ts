// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }),
}))
import { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { PATHNAME_HEADER } from '@/lib/auth/route-guard'

describe('updateSession', () => {
  it('ghi đè header đường dẫn bằng đường dẫn thật, kể cả khi client tự gửi', async () => {
    const req = new NextRequest('http://localhost/dang-nhap', { headers: { [PATHNAME_HEADER]: '/em/gia-mao' } })
    const res = await updateSession(req)
    expect(res.headers.get(`x-middleware-request-${PATHNAME_HEADER}`)).toBe('/dang-nhap')
  })
})
