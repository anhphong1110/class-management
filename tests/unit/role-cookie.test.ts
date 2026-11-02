// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { makeRoleCookie, readRoleCookie } from '@/lib/supabase/middleware'

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret'
})

describe('role cookie', () => {
  it('ký rồi đọc lại đúng role', async () => {
    const v = await makeRoleCookie('u1', 'teacher')
    expect(await readRoleCookie(v!, 'u1')).toBe('teacher')
  })
  it('từ chối cookie của người dùng khác', async () => {
    const v = await makeRoleCookie('u1', 'teacher')
    expect(await readRoleCookie(v!, 'u2')).toBeNull()
  })
  it('từ chối cookie hết hạn', async () => {
    const v = await makeRoleCookie('u1', 'student', Date.now() - 11 * 60 * 1000)
    expect(await readRoleCookie(v!, 'u1')).toBeNull()
  })
  it('từ chối cookie bị sửa role', async () => {
    const v = await makeRoleCookie('u1', 'student')
    expect(await readRoleCookie(v!.replace('.student.', '.teacher.'), 'u1')).toBeNull()
  })
  it('từ chối cookie rỗng hoặc sai dạng', async () => {
    expect(await readRoleCookie(undefined, 'u1')).toBeNull()
    expect(await readRoleCookie('abc', 'u1')).toBeNull()
  })
})
