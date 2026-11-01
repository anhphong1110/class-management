import { describe, expect, it } from 'vitest'
import { generateTempPassword, TEMP_PASSWORD_ALPHABET } from '@/lib/accounts/password'
import { pickUsername } from '@/lib/accounts/username'
import { normalizeUsername } from '@/lib/auth/username'

describe('generateTempPassword', () => {
  it('dài 10 ký tự và chỉ dùng bộ chữ cho phép', () => {
    expect(TEMP_PASSWORD_ALPHABET).toBe('abcdefghjkmnpqrstuvwxyz23456789')
    for (let i = 0; i < 200; i++) {
      const p = generateTempPassword()
      expect(p).toHaveLength(10)
      for (const ch of p) expect(TEMP_PASSWORD_ALPHABET).toContain(ch)
    }
  })
  it('rand cố định cho kết quả cố định', () => {
    expect(generateTempPassword(() => 0)).toBe('aaaaaaaaaa')
    expect(generateTempPassword((n) => n - 1)).toBe('9999999999')
    let i = 0
    expect(generateTempPassword((n) => i++ % n)).toBe('abcdefghjk')
  })
  it('gọi rand với kích thước bộ chữ', () => {
    const sizes = new Set<number>()
    generateTempPassword((n) => (sizes.add(n), 0))
    expect([...sizes]).toEqual([TEMP_PASSWORD_ALPHABET.length])
  })
})

describe('pickUsername', () => {
  it('lấy hai chữ cuối, bỏ dấu', () => {
    expect(pickUsername('Võ Hà My', new Set())).toBe('hs.hamy')
    expect(pickUsername('Nguyễn Minh Anh', new Set())).toBe('hs.minhanh')
    expect(pickUsername('Đặng Quốc Huy', new Set())).toBe('hs.quochuy')
    expect(pickUsername('Lý Thu Test', new Set())).toBe('hs.thutest')
  })
  it('tên một chữ và khoảng trắng thừa', () => {
    expect(pickUsername('  An  ', new Set())).toBe('hs.an')
    expect(pickUsername('Trần   Gia  Bảo ', new Set())).toBe('hs.giabao')
  })
  it('trùng thì thêm số 2, 3, ...', () => {
    expect(pickUsername('Võ Hà My', new Set(['hs.hamy']))).toBe('hs.hamy2')
    expect(pickUsername('Võ Hà My', new Set(['hs.hamy', 'hs.hamy2']))).toBe('hs.hamy3')
    expect(pickUsername('Võ Hà My', new Set(['hs.hamy', 'hs.hamy3']))).toBe('hs.hamy2')
  })
  it('luôn khớp normalizeUsername, kể cả tên rất dài hoặc toàn ký tự lạ', () => {
    const long = pickUsername('A '.repeat(5) + 'Nguyễn Thị Phương Thảo Nguyên Anh Thư Quỳnh Như Ý Vy', new Set())
    expect(normalizeUsername(long).ok).toBe(true)
    const taken = new Set([long])
    const next = pickUsername('A '.repeat(5) + 'Nguyễn Thị Phương Thảo Nguyên Anh Thư Quỳnh Như Ý Vy', taken)
    expect(next).not.toBe(long)
    expect(normalizeUsername(next).ok).toBe(true)
    expect(normalizeUsername(pickUsername('???', new Set())).ok).toBe(true)
  })
})

describe('signInErrorKey', () => {
  it('429 và tài khoản bị khóa có câu riêng, còn lại là sai thông tin', async () => {
    const { signInErrorKey } = await import('@/lib/auth/sign-in-error')
    expect(signInErrorKey({ status: 429 })).toBe('too_many_logins')
    expect(signInErrorKey({ code: 'over_request_rate_limit' })).toBe('too_many_logins')
    expect(signInErrorKey({ status: 400, code: 'user_banned' })).toBe('account_banned')
    expect(signInErrorKey({ status: 400, code: 'invalid_credentials' })).toBe('invalid_credentials')
    expect(signInErrorKey({})).toBe('invalid_credentials')
  })
})
