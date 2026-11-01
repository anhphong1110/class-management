'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { IMAGE_EXT, MAX_UPLOAD_BYTES, validateImageFile } from '@/lib/domain/upload'
import { announcementInput } from '@/lib/announcements/types'

type Result = { error?: string; message?: string }
type Supabase = Awaited<ReturnType<typeof createServerSupabase>>

const uuid = z.guid()

function refresh() {
  revalidatePath('/thong-bao')
  revalidatePath('/tong-quan')
}

function invalid(): Result {
  return { error: toVietnameseMessage('invalid_input') }
}

const notFound = (): Result => ({ error: toVietnameseMessage('announcement_not_found') })

async function removeFile(supabase: Supabase, path: string | null | undefined) {
  if (path) await supabase.storage.from('class-media').remove([path])
}

export async function saveAnnouncement(raw: unknown): Promise<Result & { id?: string }> {
  const user = await requireTeacher()
  const parsed = announcementInput.safeParse(raw)
  if (!parsed.success) {
    const r = (raw ?? {}) as { title?: unknown; body?: unknown }
    const blank = (v: unknown) => typeof v !== 'string' || !v.trim()
    return blank(r.title) || blank(r.body) ? { error: toVietnameseMessage('announcement_required') } : invalid()
  }
  const { id, title, body, type, pinned } = parsed.data
  const supabase = await createServerSupabase()
  if (!id) {
    const { data, error } = await supabase
      .from('announcements')
      .insert({ class_id: user.classId, title, body, type, pinned })
      .select('id')
      .single()
    if (error || !data) return { error: toVietnameseMessage(error?.message ?? 'not_allowed') }
    refresh()
    return { id: data.id, message: 'Đã đăng thông báo. Học sinh sẽ thấy ở trang Thông báo.' }
  }
  const { data, error } = await supabase
    .from('announcements')
    .update({ title, body, type, pinned })
    .eq('id', id)
    .eq('class_id', user.classId)
    .is('archived_at', null)
    .select('id')
  if (error) return { error: toVietnameseMessage(error.message) }
  if (!data?.length) return notFound()
  refresh()
  return { id, message: 'Đã lưu thay đổi. Học sinh thấy nội dung mới.' }
}

/** `pinned` là trạng thái đích: bấm hai lần liên tiếp hoặc ở hai tab không làm đảo ngược nhau. */
export async function togglePin(id: string, pinned: boolean): Promise<Result> {
  const user = await requireTeacher()
  if (!uuid.safeParse(id).success || typeof pinned !== 'boolean') return invalid()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('announcements')
    .update({ pinned })
    .eq('id', id)
    .eq('class_id', user.classId)
    .is('archived_at', null)
    .select('id')
  if (error) return { error: toVietnameseMessage(error.message) }
  if (!data?.length) return notFound()
  refresh()
  return {}
}

/** "Xóa" chỉ đặt archived_at: dòng và ảnh vẫn còn, nhưng học sinh và Tổng quan không thấy nữa. */
export async function archiveAnnouncement(id: string): Promise<Result> {
  const user = await requireTeacher()
  if (!uuid.safeParse(id).success) return invalid()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('announcements')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('class_id', user.classId)
    .is('archived_at', null)
    .select('id')
  if (error) return { error: toVietnameseMessage(error.message) }
  if (!data?.length) return notFound()
  refresh()
  return { message: 'Đã xóa thông báo.' }
}

export async function uploadAnnouncementImage(id: string, form: FormData): Promise<Result> {
  const user = await requireTeacher()
  if (!uuid.safeParse(id).success) return invalid()
  const file = form.get('file')
  if (!(file instanceof File)) return { error: toVietnameseMessage('unsupported_type') }
  if (file.size > MAX_UPLOAD_BYTES) return { error: toVietnameseMessage('file_too_large') }
  const check = validateImageFile(file)
  if (!check.ok) return { error: toVietnameseMessage(check.error) }

  const supabase = await createServerSupabase()
  const { data: row, error: readError } = await supabase
    .from('announcements')
    .select('image_path')
    .eq('id', id)
    .eq('class_id', user.classId)
    .is('archived_at', null)
    .maybeSingle()
  if (readError) throw new Error(readError.message)
  if (!row) return notFound()

  const path = `${user.classId}/announcements/${randomUUID()}.${IMAGE_EXT[file.type]}`
  const up = await supabase.storage.from('class-media').upload(path, file, { contentType: file.type })
  if (up.error) return { error: toVietnameseMessage('upload_failed') }

  const { data, error } = await supabase.from('announcements').update({ image_path: path }).eq('id', id).eq('class_id', user.classId).select('id')
  if (error || !data?.length) {
    await removeFile(supabase, path)
    return { error: toVietnameseMessage('upload_failed') }
  }
  await removeFile(supabase, row.image_path)
  refresh()
  return {}
}

export async function removeAnnouncementImage(id: string): Promise<Result> {
  const user = await requireTeacher()
  if (!uuid.safeParse(id).success) return invalid()
  const supabase = await createServerSupabase()
  const { data: row, error: readError } = await supabase
    .from('announcements')
    .select('image_path')
    .eq('id', id)
    .eq('class_id', user.classId)
    .maybeSingle()
  if (readError) throw new Error(readError.message)
  if (!row) return notFound()
  const { error } = await supabase.from('announcements').update({ image_path: null }).eq('id', id).eq('class_id', user.classId)
  if (error) return { error: toVietnameseMessage(error.message) }
  await removeFile(supabase, row.image_path)
  refresh()
  return {}
}
