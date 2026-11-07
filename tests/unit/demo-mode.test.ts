import { describe, expect, it } from 'vitest'
import { demoAccount, demoRoles, isDemoMode } from '@/lib/auth/demo'

const full = {
  DEMO_MODE: 'true',
  DEMO_TEACHER_USERNAME: 'co.khanh',
  DEMO_TEACHER_PASSWORD: 'pw-t',
  DEMO_STUDENT_USERNAME: 'hs.minhanh',
  DEMO_STUDENT_PASSWORD: 'pw-s',
}

describe('demo mode', () => {
  it('is off unless DEMO_MODE is exactly true', () => {
    expect(isDemoMode({})).toBe(false)
    expect(isDemoMode({ DEMO_MODE: '1' })).toBe(false)
    expect(isDemoMode({ DEMO_MODE: ' TRUE ' })).toBe(true)
  })

  it('returns no account when off, even if credentials are set', () => {
    expect(demoAccount('teacher', { ...full, DEMO_MODE: '' })).toBeNull()
    expect(demoRoles({ ...full, DEMO_MODE: undefined })).toEqual([])
  })

  it('returns the configured account per role', () => {
    expect(demoAccount('teacher', full)).toEqual({ username: 'co.khanh', password: 'pw-t' })
    expect(demoAccount('student', full)).toEqual({ username: 'hs.minhanh', password: 'pw-s' })
    expect(demoRoles(full)).toEqual(['teacher', 'student'])
  })

  it('only lists roles with both username and password', () => {
    expect(demoRoles({ ...full, DEMO_STUDENT_PASSWORD: '' })).toEqual(['teacher'])
  })
})
