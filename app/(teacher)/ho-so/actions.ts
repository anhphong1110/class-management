'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { IMAGE_EXT, validateImageFile } from '@/lib/domain/upload'

export type AvatarTarget = { kind: 'teacher' } | { kind: 'student'; studentId: string }

function refresh() {
  revalidatePath('/ho-so')
  revalidatePath('/', 'layout')
}

/** avatarId = null: gỡ avatar, người đó về avatar mặc định. */
export async function saveAvatar(target: AvatarTarget, avatarId: string | null): Promise<{ error?: string }> {
  const user = await requireTeacher()
  const supabase = await createServerSupabase()
  const { error } =
    target.kind === 'teacher'
      ? await supabase.rpc('set_avatar_for', { p_profile_id: user.userId, p_avatar_id: avatarId })
      : await supabase.rpc('set_student_avatar', { p_student_id: target.studentId, p_avatar_id: avatarId })
  if (error) return { error: toVietnameseMessage(error.message) }
  refresh()
  return {}
}

export async function uploadAvatar(form: FormData): Promise<{ error?: string; avatarId?: string }> {
  const user = await requireTeacher()
  const file = form.get('file')
  if (!(file instanceof File)) return { error: toVietnameseMessage('unsupported_type') }
  const check = validateImageFile(file)
  if (!check.ok) return { error: toVietnameseMessage(check.error) }

  const rawLabel = String(form.get('label') ?? '').trim().slice(0, 40)
  const label = rawLabel || 'Avatar mới'
  const path = `${user.classId}/avatars/${randomUUID()}.${IMAGE_EXT[file.type]}`
  const supabase = await createServerSupabase()

  const up = await supabase.storage.from('class-media').upload(path, file, { contentType: file.type })
  if (up.error) return { error: toVietnameseMessage('upload_failed') }

  const { data, error } = await supabase
    .from('avatar_library')
    .insert({ class_id: user.classId, kind: 'upload', image_path: path, label })
    .select('id')
    .single()
  if (error || !data) {
    await supabase.storage.from('class-media').remove([path])
    return { error: toVietnameseMessage('upload_failed') }
  }
  refresh()
  return { avatarId: data.id }
}

/** Xóa một ảnh avatar tải lên khỏi thư viện (RPC), rồi xóa file trong storage. Người đang dùng ảnh về mặc định. */
export async function deleteAvatarUpload(id: string): Promise<{ error?: string }> {
  await requireTeacher()
  if (!z.guid().safeParse(id).success) return { error: toVietnameseMessage('avatar_not_found') }
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('delete_avatar_upload', { p_id: id })
  if (error) return { error: toVietnameseMessage(error.message) }
  if (typeof data === 'string' && data) await supabase.storage.from('class-media').remove([data])
  refresh()
  return {}
}

export async function setStudentCanChangeAvatar(on: boolean): Promise<{ error?: string }> {
  const user = await requireTeacher()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('class_settings')
    .update({ student_can_change_avatar: on })
    .eq('class_id', user.classId)
    .select('class_id')
  if (error || !data?.length) return { error: toVietnameseMessage('not_allowed') }
  refresh()
  return {}
}
