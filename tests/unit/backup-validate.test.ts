import { describe, expect, it } from 'vitest'
import { validateBackup } from '@/lib/backup/validate'
import { BACKUP_FORMAT, BACKUP_TABLES } from '@/lib/backup/format'

const ID = '00000000-0000-0000-0000-0000000000c1'

function valid() {
  const tables: Record<string, unknown[]> = {}
  for (const t of BACKUP_TABLES) tables[t] = []
  tables.students = [
    { id: '00000000-0000-0000-0000-0000000000a1', class_id: ID, code: 'HS01', roll_no: 1, full_name: 'A' },
    { id: '00000000-0000-0000-0000-0000000000a2', class_id: ID, code: 'HS02', roll_no: 2, full_name: 'B' },
  ]
  tables.star_transactions = [{ id: '00000000-0000-0000-0000-0000000000b1', class_id: ID, delta: 3 }]
  tables.class_settings = [{ class_id: ID }]
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exported_at: '2026-11-01T00:00:00Z',
    class: { id: ID, class_name: '5A', school_year: '2026 – 2027' },
    tables,
  }
}

describe('validateBackup', () => {
  it('nhận bản sao lưu hợp lệ và đếm số dòng từng bảng', () => {
    const r = validateBackup(valid())
    expect(r).toEqual({
      ok: true,
      summary: { className: '5A', schoolYear: '2026 – 2027', counts: expect.objectContaining({ students: 2, star_transactions: 1, rewards: 0 }) },
    })
  })

  it('liệt kê đúng các bảng cần sao lưu (không có profiles, audit_logs)', () => {
    expect(BACKUP_TABLES).not.toContain('profiles')
    expect(BACKUP_TABLES).not.toContain('audit_logs')
    expect(BACKUP_TABLES).toContain('class_settings')
    expect(BACKUP_TABLES.length).toBe(new Set(BACKUP_TABLES).size)
  })

  const bad: [string, unknown][] = [
    ['null', null],
    ['chuỗi', 'x'],
    ['mảng', []],
    ['{"a":1}', { a: 1 }],
    ['rỗng', {}],
  ]
  it.each(bad)('từ chối %s', (_n, v) => {
    expect(validateBackup(v)).toEqual({ ok: false })
  })

  it('từ chối sai format', () => {
    expect(validateBackup({ ...valid(), format: 'khac' })).toEqual({ ok: false })
  })
  it('từ chối version 2, "1" và thiếu version', () => {
    expect(validateBackup({ ...valid(), version: 2 })).toEqual({ ok: false })
    expect(validateBackup({ ...valid(), version: '1' })).toEqual({ ok: false })
    const rest: Record<string, unknown> = valid()
    delete rest.version
    expect(validateBackup(rest)).toEqual({ ok: false })
  })
  it('từ chối thiếu lớp, lớp sai kiểu, id lớp không phải GUID', () => {
    const rest: Record<string, unknown> = valid()
    delete rest.class
    expect(validateBackup(rest)).toEqual({ ok: false })
    expect(validateBackup({ ...valid(), class: 'x' })).toEqual({ ok: false })
    expect(validateBackup({ ...valid(), class: { id: 'abc', class_name: '5A', school_year: 'x' } })).toEqual({ ok: false })
    expect(validateBackup({ ...valid(), class: { id: ID, class_name: '', school_year: 'x' } })).toEqual({ ok: false })
    expect(validateBackup({ ...valid(), class: { id: ID, class_name: '5A', school_year: 3 } })).toEqual({ ok: false })
  })
  it('từ chối thiếu "tables", tables sai kiểu hoặc thiếu một bảng', () => {
    const rest: Record<string, unknown> = valid()
    delete rest.tables
    expect(validateBackup(rest)).toEqual({ ok: false })
    expect(validateBackup({ ...valid(), tables: [] })).toEqual({ ok: false })
    const v = valid()
    delete (v.tables as Record<string, unknown>).rewards
    expect(validateBackup(v)).toEqual({ ok: false })
  })
  it('từ chối bảng không phải mảng hoặc có dòng không phải object', () => {
    const a = valid()
    ;(a.tables as Record<string, unknown>).rewards = {}
    expect(validateBackup(a)).toEqual({ ok: false })
    const b = valid()
    ;(b.tables as Record<string, unknown>).rewards = [1]
    expect(validateBackup(b)).toEqual({ ok: false })
    const c = valid()
    ;(c.tables as Record<string, unknown>).rewards = [null]
    expect(validateBackup(c)).toEqual({ ok: false })
  })
  it('từ chối class_settings rỗng hoặc có hai dòng', () => {
    const a = valid()
    ;(a.tables as Record<string, unknown>).class_settings = []
    expect(validateBackup(a)).toEqual({ ok: false })
    const b = valid()
    ;(b.tables as Record<string, unknown>).class_settings = [{ class_id: ID }, { class_id: ID }]
    expect(validateBackup(b)).toEqual({ ok: false })
  })
  it('từ chối dòng thiếu id hoặc id không phải GUID (trừ class_settings)', () => {
    const a = valid()
    ;(a.tables as Record<string, unknown>).students = [{ code: 'HS01' }]
    expect(validateBackup(a)).toEqual({ ok: false })
    const b = valid()
    ;(b.tables as Record<string, unknown>).students = [{ id: 'khong-phai-guid' }]
    expect(validateBackup(b)).toEqual({ ok: false })
  })
})
