import { BACKUP_FORMAT, BACKUP_TABLES, BACKUP_TABLES_WITHOUT_ID, BACKUP_VERSION, type BackupCheck } from './format'

const GUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Kiểm hình dạng bản sao lưu (cùng luật với private.backup_valid trong cơ sở dữ liệu). */
export function validateBackup(json: unknown): BackupCheck {
  if (!isObject(json)) return { ok: false }
  if (json.format !== BACKUP_FORMAT || json.version !== BACKUP_VERSION) return { ok: false }

  const cls = json.class
  if (!isObject(cls)) return { ok: false }
  if (typeof cls.id !== 'string' || !GUID.test(cls.id)) return { ok: false }
  if (typeof cls.class_name !== 'string' || cls.class_name.trim() === '') return { ok: false }
  if (typeof cls.school_year !== 'string') return { ok: false }

  if (!isObject(json.tables)) return { ok: false }
  const counts: Record<string, number> = {}
  for (const t of BACKUP_TABLES) {
    const rows = json.tables[t]
    if (!Array.isArray(rows)) return { ok: false }
    // Cài đặt lớp: đúng một dòng.
    if (t === 'class_settings' && rows.length !== 1) return { ok: false }
    for (const row of rows) {
      if (!isObject(row)) return { ok: false }
      if (!BACKUP_TABLES_WITHOUT_ID.includes(t) && (typeof row.id !== 'string' || !GUID.test(row.id))) return { ok: false }
    }
    counts[t] = rows.length
  }
  return { ok: true, summary: { className: cls.class_name, schoolYear: cls.school_year, counts } }
}
