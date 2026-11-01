'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { IMAGE_EXT, validateImageFile } from '@/lib/domain/upload'

type Result = { error?: string }

/** Server Action chỉ nhận body tới 2 MB; ảnh lớn hơn phải được nén ở trình duyệt trước. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

const text = z.string().max(500)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
const infoInput = z
  .object({
    school_name: text,
    class_name: text,
    school_year: text,
    teacher_name: text,
    slogan: text,
    theme: z.enum(['indigo', 'pink', 'mint', 'gold']),
    term1_start: date,
    term1_end: date,
    term2_start: date,
    term2_end: date,
  })
  .partial()
  .strict()

const flag = z.boolean()
// Giới hạn số do hàm trong cơ sở dữ liệu kiểm, để câu báo lỗi đúng là câu của hàm.
const settingsInput = z
  .object({
    require_approval: flag,
    reserve_on_request: flag,
    only_enough: flag,
    feature_missions: flag,
    feature_random: flag,
    feature_display: flag,
    feature_rewards: flag,
    student_can_view_profile: flag,
    student_can_view_history: flag,
    student_can_view_rank: flag,
    student_can_view_rewards: flag,
    student_can_view_timetable: flag,
    student_can_view_news: flag,
    student_can_view_attendance: flag,
    weekly_redeem_limit: z.number().int().min(-1000).max(100000),
    star_steps: z.array(z.number().int().min(-1000).max(100000)).max(100),
  })
  .partial()
  .strict()

const saturdayInput = z.object({ on: z.boolean(), clear: z.boolean() })
const BRANDING = { logo_path: 'logo_path', class_logo_path: 'class_logo_path', cover_path: 'cover_path' } as const
const kindInput = z.enum(['logo_path', 'class_logo_path', 'cover_path'])

function invalid(): Result {
  return { error: toVietnameseMessage('invalid_input') }
}

/** Màu, logo, ảnh bìa và tên lớp hiện ở mọi trang, nên làm mới từ layout gốc. */
function refresh() {
  revalidatePath('/', 'layout')
}

export async function saveClassInfo(raw: unknown): Promise<Result> {
  await requireTeacher()
  const parsed = infoInput.safeParse(raw)
  if (!parsed.success || Object.keys(parsed.data).length === 0) return invalid()
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('save_class_info', { p: parsed.data })
  if (error) return { error: toVietnameseMessage(error.message) }
  refresh()
  return {}
}

export async function saveClassSettings(raw: unknown): Promise<Result> {
  await requireTeacher()
  const parsed = settingsInput.safeParse(raw)
  if (!parsed.success || Object.keys(parsed.data).length === 0) return invalid()
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('save_class_settings', { p: parsed.data })
  if (error) return { error: toVietnameseMessage(error.message) }
  refresh()
  return {}
}

export async function setSaturday(on: boolean, clear: boolean): Promise<Result> {
  await requireTeacher()
  const parsed = saturdayInput.safeParse({ on, clear })
  if (!parsed.success) return invalid()
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('set_timetable_saturday', { p_on: parsed.data.on, p_clear: parsed.data.clear })
  if (error) return { error: toVietnameseMessage(error.message) }
  refresh()
  revalidatePath('/thoi-khoa-bieu')
  return {}
}

export async function uploadBranding(form: FormData): Promise<Result> {
  const user = await requireTeacher()
  const kind = kindInput.safeParse(form.get('kind'))
  if (!kind.success) return invalid()
  const file = form.get('file')
  if (!(file instanceof File)) return { error: toVietnameseMessage('unsupported_type') }
  if (file.size > MAX_UPLOAD_BYTES) return { error: toVietnameseMessage('file_too_large') }
  const check = validateImageFile(file)
  if (!check.ok) return { error: toVietnameseMessage(check.error) }

  const column = BRANDING[kind.data]
  const supabase = await createServerSupabase()
  const { data: before, error: readError } = await supabase.from('classes').select(column).eq('id', user.classId).single()
  if (readError) throw new Error(readError.message)
  const oldPath = (before as Record<string, string | null>)[column]

  const path = `${user.classId}/branding/${randomUUID()}.${IMAGE_EXT[file.type]}`
  const up = await supabase.storage.from('class-media').upload(path, file, { contentType: file.type })
  if (up.error) return { error: toVietnameseMessage('upload_failed') }

  const { error } = await supabase.rpc('save_class_info', { p: { [column]: path } })
  if (error) {
    await supabase.storage.from('class-media').remove([path])
    return { error: toVietnameseMessage(error.message) }
  }
  if (oldPath) await supabase.storage.from('class-media').remove([oldPath])
  refresh()
  return {}
}
