import { describe, expect, it } from 'vitest'
import { safeNext } from '@/lib/auth/safe-next'

describe('safeNext', () => {
  it.each([
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    '/.//evil.com',
    '/a/..//evil.com',
    '/%2e//evil.com',
    '',
    undefined,
    ['a'],
  ])('rejects %j', (v) => {
    expect(safeNext(v)).toBeNull()
  })

  it.each(['/thoi-khoa-bieu?x=1', '/em/sao#top', '/a?b=//c'])('passes %s through', (v) => {
    expect(safeNext(v)).toBe(v)
  })
})
