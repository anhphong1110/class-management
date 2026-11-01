import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AVATAR_PRESETS,
  buildAvatarRows,
  buildClassRow,
  missingEnv,
  parseBootstrapEnv,
} from '../../scripts/lib/bootstrap'

const full = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'k',
  AUTH_EMAIL_DOMAIN: 'lop.example',
  SCHOOL_NAME: 'Tiểu học A',
  CLASS_NAME: 'Năm 8 (5/8)',
  SCHOOL_YEAR: '2026 – 2027',
  TEACHER_NAME: 'Cô Khanh',
  TEACHER_USERNAME: 'co.khanh',
  TEACHER_PASSWORD: 'mat-khau-dai',
}

describe('missingEnv', () => {
  it('liệt kê đúng biến thiếu hoặc rỗng', () => {
    const env = { ...full, CLASS_NAME: '  ', TEACHER_PASSWORD: undefined }
    expect(missingEnv(env)).toEqual(['CLASS_NAME', 'TEACHER_PASSWORD'])
  })
  it('đủ biến thì rỗng', () => {
    expect(missingEnv(full)).toEqual([])
  })
})

describe('parseBootstrapEnv', () => {
  it('trả lỗi nêu tên biến thiếu', () => {
    const r = parseBootstrapEnv({ ...full, SCHOOL_NAME: undefined })
    expect(r).toEqual({ ok: false, error: 'Thiếu biến môi trường: SCHOOL_NAME' })
  })
  it('từ chối mật khẩu ngắn mà không lộ mật khẩu', () => {
    const r = parseBootstrapEnv({ ...full, TEACHER_PASSWORD: 'abc' })
    expect(r.ok).toBe(false)
    expect(JSON.stringify(r)).not.toContain('abc')
  })
  it('từ chối tên đăng nhập sai', () => {
    expect(parseBootstrapEnv({ ...full, TEACHER_USERNAME: 'Cô Khanh' }).ok).toBe(false)
  })
  it('từ chối ngày học kỳ sai định dạng', () => {
    const r = parseBootstrapEnv({ ...full, TERM1_START: '05/09/2026' })
    expect(r.ok).toBe(false)
  })
  it('từ chối ngày học kỳ sai thứ tự', () => {
    const t = (o: Record<string, string>) => parseBootstrapEnv({ ...full, ...o }).ok
    expect(t({ TERM1_START: '2026-12-01', TERM1_END: '2026-09-05' })).toBe(false)
    expect(t({ TERM1_END: '2027-01-10', TERM2_START: '2027-01-10' })).toBe(false)
    expect(t({ TERM2_START: '2027-02-01', TERM2_END: '2027-01-15' })).toBe(false)
    expect(t({ TERM1_START: '2026-09-05', TERM1_END: '2027-01-10', TERM2_START: '2027-01-11', TERM2_END: '2027-05-31' })).toBe(true)
    expect(t({ TERM1_START: '2026-09-05', TERM1_END: '2026-09-05' })).toBe(true)
  })
  it('chuẩn hóa tên đăng nhập và nhận ngày tùy chọn', () => {
    const r = parseBootstrapEnv({ ...full, TEACHER_USERNAME: ' Co.Khanh ', TERM1_START: '2026-09-05' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.teacherUsername).toBe('co.khanh')
      expect(r.value.term1Start).toBe('2026-09-05')
      expect(r.value.term2End).toBeNull()
    }
  })
})

describe('buildClassRow', () => {
  it('dựng lớp với theme indigo và ngày null khi không đặt', () => {
    const r = parseBootstrapEnv(full)
    if (!r.ok) throw new Error('env')
    expect(buildClassRow(r.value, 'owner-1')).toEqual({
      school_name: 'Tiểu học A',
      class_name: 'Năm 8 (5/8)',
      school_year: '2026 – 2027',
      teacher_name: 'Cô Khanh',
      theme: 'indigo',
      term1_start: null,
      term1_end: null,
      term2_start: null,
      term2_end: null,
      owner_id: 'owner-1',
    })
  })
})

describe('avatar preset', () => {
  it('có 12 dòng, is_demo=false, kind preset', () => {
    const rows = buildAvatarRows('c1')
    expect(rows).toHaveLength(12)
    expect(rows.every((r) => r.class_id === 'c1' && r.kind === 'preset' && r.is_demo === false)).toBe(true)
  })
  it('khớp avatar_library trong supabase/seed.sql', () => {
    const sql = readFileSync(path.resolve(import.meta.dirname, '../../supabase/seed.sql'), 'utf8')
    const re = /'preset', '(\{[^']*\})', '([^']*)', false\)/g
    const fromSeed = [...sql.matchAll(re)].map((m) => ({ preset: JSON.parse(m[1]), label: m[2] }))
    expect(fromSeed).toHaveLength(12)
    expect(AVATAR_PRESETS).toEqual(fromSeed)
  })
})
