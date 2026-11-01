'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { toVietnameseMessage } from '@/lib/errors'
import { BACKUP_BUCKET, MAX_BACKUP_BYTES } from '@/lib/backup/format'
import { restorePathSchema } from '@/lib/backup/storage'
import { validateBackup } from '@/lib/backup/validate'

const BUCKET = 'class-media'
const guid = z.guid()
const restoreResult = z.object({
  classId: guid,
  imagePaths: z.array(z.object({ from: z.string(), to: z.string() })),
})

const invalid = () => ({ error: toVietnameseMessage('invalid_backup') })

/**
 * Chép ảnh sang thư mục lớp mới bằng client admin (Storage RLS không cho chép chéo lớp), rồi đặt đường dẫn null
 * cho mọi ảnh không chép được. Chỉ chép từ lớp cũ do chính giáo viên này sở hữu: file sao lưu do người dùng
 * đưa lên, không được dùng để đọc ảnh của lớp người khác.
 */
async function copyImages(userId: string, oldClassId: string, classId: string, paths: { from: string; to: string }[]) {
  if (paths.length === 0) return
  const admin = createAdminSupabase()
  const store = admin.storage.from(BUCKET)

  const { data: source, error: sourceError } = await admin.from('classes').select('owner_id').eq('id', oldClassId).maybeSingle()
  if (sourceError) console.error('restore: không đọc được lớp nguồn:', sourceError.message)
  const owned = !sourceError && source?.owner_id === userId

  const failed: string[] = []
  for (const { from, to } of paths) {
    const safe = from.startsWith(`${oldClassId}/`) && to.startsWith(`${classId}/`)
    if (!owned || !safe) {
      failed.push(to)
      continue
    }
    const { error } = await store.copy(from, to)
    if (error) failed.push(to)
  }
  if (failed.length === 0) return

  // Ảnh nguồn không còn: bỏ đường dẫn trong lớp mới để giao diện không trỏ vào ảnh không có.
  const results = await Promise.all([
    admin.from('avatar_library').update({ image_path: null }).eq('class_id', classId).in('image_path', failed),
    admin.from('rewards').update({ image_path: null }).eq('class_id', classId).in('image_path', failed),
    admin.from('announcements').update({ image_path: null }).eq('class_id', classId).in('image_path', failed),
    admin.from('classes').update({ logo_path: null }).eq('id', classId).in('logo_path', failed),
    admin.from('classes').update({ class_logo_path: null }).eq('id', classId).in('class_logo_path', failed),
    admin.from('classes').update({ cover_path: null }).eq('id', classId).in('cover_path', failed),
  ])
  for (const r of results) if (r.error) console.error('restore: không bỏ được đường dẫn ảnh:', r.error.message)
}

/**
 * Khôi phục từ file sao lưu vào một lớp mới. Trình duyệt đã tải file lên `class-backups/<lớp>/<uuid>.json`
 * (Vercel giới hạn thân yêu cầu 4,5 MB nên file không đi qua Server Action). Thành công thì chuyển về Tổng quan;
 * lỗi thì trả câu báo. File tạm luôn bị xóa (client admin, vì sau khi khôi phục giáo viên đã sang lớp khác).
 */
export async function restoreBackup(path: string): Promise<{ error: string }> {
  const user = await requireTeacher()
  if (!restorePathSchema(user.classId).safeParse(path).success) return invalid()

  try {
    const supabase = await createServerSupabase()
    const { data: blob, error: downloadError } = await supabase.storage.from(BACKUP_BUCKET).download(path)
    if (downloadError || !blob) return invalid()
    if (blob.size === 0 || blob.size > MAX_BACKUP_BYTES) return invalid()

    let json: unknown
    try {
      json = JSON.parse(await blob.text())
    } catch {
      return invalid()
    }
    const check = validateBackup(json)
    if (!check.ok) return invalid()
    const oldClassId = (json as { class: { id: string } }).class.id

    const { data, error } = await supabase.rpc('restore_class_backup', { p_backup: json as never })
    if (error) return { error: toVietnameseMessage(error.message) }
    const parsed = restoreResult.parse(data)

    await copyImages(user.userId, oldClassId, parsed.classId, parsed.imagePaths)

    revalidatePath('/', 'layout')
  } finally {
    const { error } = await createAdminSupabase().storage.from(BACKUP_BUCKET).remove([path])
    if (error) console.error('restore: không xóa được file tạm:', error.message)
  }  redirect('/tong-quan')
}
