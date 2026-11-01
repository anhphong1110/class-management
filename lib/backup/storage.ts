import { z } from 'zod'

/** Đường dẫn file khôi phục tạm trong bucket class-backups: <lớp>/<uuid>.json. */
export function restorePathSchema(classId: string) {
  return z.string().regex(
    new RegExp(`^${classId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.json$`, 'i'),
  )
}
