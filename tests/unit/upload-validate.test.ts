import { describe, expect, it } from 'vitest'
import { MAX_UPLOAD_BYTES, validateImageFile } from '@/lib/domain/upload'

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

describe('validateImageFile với giới hạn tải lên 2 MB', () => {
  it('nhận đúng 2 MB, từ chối hơn 2 MB', () => {
    expect(validateImageFile({ size: MAX_UPLOAD_BYTES, type: 'image/png' }, MAX_UPLOAD_BYTES)).toEqual({ ok: true })
    expect(validateImageFile({ size: MAX_UPLOAD_BYTES + 1, type: 'image/png' }, MAX_UPLOAD_BYTES)).toEqual({ ok: false, error: 'file_too_large' })
  })
})
