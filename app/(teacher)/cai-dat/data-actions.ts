'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { toVietnameseMessage } from '@/lib/errors'
import { BACKUP_BUCKET, MAX_BACKUP_BYTES } from '@/lib/backup/format'
import { restorePathSchema } from '@/lib/backup/storage'
import { validateBackup } from '@/lib/backup/validate'
import { COPY_KEYS } from '@/lib/backup/year'
import { FLASH_COOKIE } from '@/lib/flash/cookie'

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
  }
  redirect('/tong-quan')
}

const newYearInput = z.object({
  school_year: z.string().trim().min(1).max(100),
  class_name: z.string().trim().min(1).max(100),
  teacher_name: z.string().trim().max(100).optional(),
  copy: z.array(z.enum(COPY_KEYS)).max(COPY_KEYS.length),
})

/** Sau khi mở năm mới: chép ảnh (avatar, quà, logo, bìa) từ lớp cũ sang thư mục lớp mới; không chép được thì bỏ đường dẫn. */
async function copyNewYearImages(userId: string, oldClassId: string, classId: string) {
  const admin = createAdminSupabase()
  const [avatars, rewards, cls] = await Promise.all([
    admin.from('avatar_library').select('image_path').eq('class_id', classId).not('image_path', 'is', null),
    admin.from('rewards').select('image_path').eq('class_id', classId).not('image_path', 'is', null),
    admin.from('classes').select('logo_path, class_logo_path, cover_path').eq('id', classId).single(),
  ])
  for (const r of [avatars, rewards, cls]) if (r.error) console.error('new-year: không đọc được đường dẫn ảnh:', r.error.message)
  const found = [
    ...(avatars.data ?? []).map((r) => r.image_path),
    ...(rewards.data ?? []).map((r) => r.image_path),
    cls.data?.logo_path,
    cls.data?.class_logo_path,
    cls.data?.cover_path,
  ].filter((p): p is string => typeof p === 'string' && p.startsWith(`${classId}/`))
  const paths = [...new Set(found)].map((to) => ({ from: `${oldClassId}/${to.slice(classId.length + 1)}`, to }))
  await copyImages(userId, oldClassId, classId, paths)
}

/**
 * Mở năm học mới: lưu trữ lớp hiện tại, tạo lớp mới (chép các mục đã chọn) và chuyển giáo viên sang lớp mới.
 * Thành công thì để lại tin trong cookie rồi chuyển về Tổng quan.
 */
export async function openNewYear(input: unknown): Promise<{ error: string }> {
  const user = await requireTeacher()
  const parsed = newYearInput.safeParse(input)
  if (!parsed.success) return { error: toVietnameseMessage('invalid_input') }
  const { school_year, class_name, teacher_name, copy } = parsed.data

  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('start_new_school_year', {
    p: { school_year, class_name, ...(teacher_name ? { teacher_name } : {}), copy },
  })
  if (error) return { error: toVietnameseMessage(error.message) }
  const classId = guid.parse(data)

  await copyNewYearImages(user.userId, user.classId, classId)

  ;(await cookies()).set(FLASH_COOKIE, `Đã mở năm học ${school_year}.`, { path: '/', maxAge: 60, sameSite: 'lax' })
  revalidatePath('/', 'layout')
  redirect('/tong-quan')
}

const deleteResult = z.object({
  deletedStudents: z.number().int(),
  keptCatalog: z.number().int(),
  authUserIds: z.array(guid),
})

/**
 * Xóa dữ liệu demo của lớp hiện tại (RPC), rồi xóa các tài khoản Auth của học sinh demo bằng client admin.
 * Không xóa được tài khoản Auth nào thì báo lỗi nhưng dữ liệu lớp đã xóa (tài khoản đó không còn hồ sơ nên không vào được).
 */
export async function deleteDemoData(): Promise<{ error: string } | { message: string }> {
  await requireTeacher()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('delete_demo_data')
  if (error) return { error: toVietnameseMessage(error.message) }
  const result = deleteResult.parse(data)

  const admin = createAdminSupabase()
  let failed = 0
  for (const id of result.authUserIds) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(id)
    if (deleteError) {
      failed += 1
      console.error('delete-demo: không xóa được tài khoản Auth:', id, deleteError.message)
    }
  }
  revalidatePath('/', 'layout')
  if (failed > 0) return { error: toVietnameseMessage('demo_accounts_left') }
  const kept = result.keptCatalog > 0 ? ` Giữ lại ${result.keptCatalog} mục vì dữ liệu thật còn dùng.` : ''
  return { message: `Đã xóa dữ liệu demo.${kept}` }
}
