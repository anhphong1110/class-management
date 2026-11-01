export const BACKUP_FORMAT = 'tram-khong-gian-backup'
export const BACKUP_VERSION = 1

/** Mọi bảng có class_id (trừ profiles, audit_logs), theo thứ tự chèn của private.backup_tables(). */
export const BACKUP_TABLES = [
  'avatar_library',
  'students',
  'groups',
  'group_members',
  'star_criteria',
  'rewards',
  'reward_requests',
  'star_transactions',
  'attendance',
  'subjects',
  'timetable_slots',
  'announcements',
  'missions',
  'mission_completions',
  'badges',
  'student_badges',
  'class_settings',
] as const

/** Bảng duy nhất không có cột id (khóa chính là class_id). */
export const BACKUP_TABLES_WITHOUT_ID: readonly string[] = ['class_settings']

export const BACKUP_BUCKET = 'class-backups'

/** Giới hạn dung lượng file khôi phục. */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024

export type BackupSummary = { className: string; schoolYear: string; counts: Record<string, number> }
export type BackupCheck = { ok: true; summary: BackupSummary } | { ok: false }
