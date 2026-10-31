import { describe, expect, it } from 'vitest'
import { validateImageFile } from '@/lib/domain/upload'

describe('validateImageFile', () => {
  it('nhận PNG đúng 5 MB', () => {
    expect(validateImageFile({ size: 5242880, type: 'image/png' })).toEqual({ ok: true })
  })
  it('từ chối quá 5 MB', () => {
    expect(validateImageFile({ size: 5242881, type: 'image/png' })).toEqual({ ok: false, error: 'file_too_large' })
  })
  it('từ chối GIF', () => {
    expect(validateImageFile({ size: 100, type: 'image/gif' })).toEqual({ ok: false, error: 'unsupported_type' })
  })
  it('nhận jpeg và webp', () => {
    expect(validateImageFile({ size: 1, type: 'image/jpeg' }).ok).toBe(true)
    expect(validateImageFile({ size: 1, type: 'image/webp' }).ok).toBe(true)
  })
})
