import { describe, expect, it } from 'vitest'
import { normalizeUsername, usernameToEmail } from '@/lib/auth/username'

describe('normalizeUsername', () => {
  it('chuẩn hóa chữ hoa và khoảng trắng hai đầu', () => {
    expect(normalizeUsername(' Co.Khanh ')).toEqual({ ok: true, username: 'co.khanh' })
  })
  it('từ chối tên có dấu, khoảng trắng giữa, quá ngắn, quá dài', () => {
    expect(normalizeUsername('hs.minhánh').ok).toBe(false)
    expect(normalizeUsername('a b').ok).toBe(false)
    expect(normalizeUsername('ab').ok).toBe(false)
    expect(normalizeUsername('a'.repeat(33)).ok).toBe(false)
  })
  it('chấp nhận đúng 32 ký tự', () => {
    expect(normalizeUsername('a'.repeat(32)).ok).toBe(true)
  })
})

describe('usernameToEmail', () => {
  it('ghép email ẩn với tên miền mặc định', () => {
    delete process.env.AUTH_EMAIL_DOMAIN
    expect(usernameToEmail('co.khanh')).toBe('co.khanh@tram58.local')
  })
})
