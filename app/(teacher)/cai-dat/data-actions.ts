'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { toVietnameseMessage } from '@/lib/errors'
import { MAX_BACKUP_BYTES } from '@/lib/backup/format'
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

/** Khôi phục từ file sao lưu vào một lớp mới. Thành công thì chuyển về Tổng quan; lỗi thì trả câu báo. */
export async function restoreBackup(formData: FormData): Promise<{ error: string }> {
  const user = await requireTeacher()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_BACKUP_BYTES) return invalid()

  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    return invalid()
  }
  const check = validateBackup(json)
  if (!check.ok) return invalid()
  const oldClassId = (json as { class: { id: string } }).class.id

  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('restore_class_backup', { p_backup: json as never })
  if (error) return { error: toVietnameseMessage(error.message) }
  const parsed = restoreResult.parse(data)

  await copyImages(user.userId, oldClassId, parsed.classId, parsed.imagePaths)

  revalidatePath('/', 'layout')
  redirect('/tong-quan')
}
