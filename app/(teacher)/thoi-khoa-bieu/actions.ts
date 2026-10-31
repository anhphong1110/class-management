'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { classShortName } from '@/lib/classes/short-name'
import { buildTimetableWorkbook, timetableFileName } from '@/lib/timetable/export'
import { nextInk, SUBJECT_PALETTE } from '@/lib/timetable/palette'
import { getTimetable } from '@/lib/timetable/queries'

type Result = { error?: string }

// guid: `z.uuid()` của Zod 4 đòi đúng phiên bản RFC, còn id seed thì không có.
const uuid = z.guid()
const nameSchema = z.string().trim().min(1).max(40)
const slotInput = z
  .object({
    weekday: z.number().int().min(1).max(6),
    session: z.enum(['morning', 'afternoon']),
    period: z.number().int().min(1).max(5),
    subjectId: uuid.nullable(),
  })
  .refine((v) => v.session === 'morning' || v.period <= 3)

const invalid = (): Result => ({ error: toVietnameseMessage('invalid_input') })
const refresh = () => revalidatePath('/thoi-khoa-bieu')
const duplicate = (name: string) => `Môn "${name}" đã có trong danh sách.`

export async function setSlot(
  weekday: number,
  session: 'morning' | 'afternoon',
  period: number,
  subjectId: string | null,
): Promise<Result> {
  const user = await requireTeacher()
  const parsed = slotInput.safeParse({ weekday, session, period, subjectId })
  if (!parsed.success) return invalid()
  const supabase = await createServerSupabase()
  if (weekday === 6) {
    const { data: settings, error: settingsError } = await supabase
      .from('class_settings')
      .select('timetable_saturday')
      .eq('class_id', user.classId)
      .maybeSingle()
    if (settingsError) throw new Error(settingsError.message)
    if (!settings?.timetable_saturday) return { error: toVietnameseMessage('saturday_off') }
  }
  const key = { class_id: user.classId, weekday, session, period }
  const { error } = parsed.data.subjectId
    ? await supabase
        .from('timetable_slots')
        .upsert({ ...key, subject_id: parsed.data.subjectId }, { onConflict: 'class_id,weekday,session,period' })
    : await supabase.from('timetable_slots').delete().match(key)
  if (error) return { error: toVietnameseMessage(error.code === '23503' ? 'subject_not_found' : 'not_allowed') }
  refresh()
  return {}
}

export async function addSubject(name: string): Promise<Result> {
  const user = await requireTeacher()
  const parsed = nameSchema.safeParse(name)
  if (!parsed.success) return { error: toVietnameseMessage(name.trim() ? 'invalid_input' : 'subject_name_required') }
  const supabase = await createServerSupabase()
  const { data: existing, error: readError } = await supabase.from('subjects').select('sort_order').eq('class_id', user.classId)
  if (readError) throw new Error(readError.message)
  const count = existing?.length ?? 0
  const max = Math.max(0, ...(existing ?? []).map((s) => s.sort_order))
  const { error } = await supabase.from('subjects').insert({
    class_id: user.classId,
    name: parsed.data,
    // Như thiết kế: môn mới lấy màu theo số môn hiện có, trong 10 màu đầu.
    color: SUBJECT_PALETTE[count % 10].ink,
    sort_order: max + 1,
  })
  if (error) return { error: error.code === '23505' ? duplicate(parsed.data) : toVietnameseMessage('not_allowed') }
  refresh()
  return {}
}

export async function renameSubject(id: string, name: string): Promise<Result> {
  const user = await requireTeacher()
  if (!uuid.safeParse(id).success) return invalid()
  const parsed = nameSchema.safeParse(name)
  if (!parsed.success) return { error: toVietnameseMessage(name.trim() ? 'invalid_input' : 'subject_name_required') }
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('subjects')
    .update({ name: parsed.data })
    .eq('id', id)
    .eq('class_id', user.classId)
    .select('id')
  if (error) return { error: error.code === '23505' ? duplicate(parsed.data) : toVietnameseMessage('not_allowed') }
  if (!data?.length) return invalid()
  refresh()
  return {}
}

export async function cycleSubjectColor(id: string): Promise<Result> {
  const user = await requireTeacher()
  if (!uuid.safeParse(id).success) return invalid()
  const supabase = await createServerSupabase()
  const { data: row, error: readError } = await supabase
    .from('subjects')
    .select('color')
    .eq('id', id)
    .eq('class_id', user.classId)
    .maybeSingle()
  if (readError) throw new Error(readError.message)
  if (!row) return invalid()
  const { error } = await supabase.from('subjects').update({ color: nextInk(row.color) }).eq('id', id).eq('class_id', user.classId)
  if (error) return { error: toVietnameseMessage('not_allowed') }
  refresh()
  return {}
}

export async function deleteSubject(id: string): Promise<Result> {
  const user = await requireTeacher()
  if (!uuid.safeParse(id).success) return invalid()
  const supabase = await createServerSupabase()
  const { data: row, error: readError } = await supabase
    .from('subjects')
    .select('name')
    .eq('id', id)
    .eq('class_id', user.classId)
    .maybeSingle()
  if (readError) throw new Error(readError.message)
  if (!row) return invalid()
  const { error } = await supabase.from('subjects').delete().eq('id', id).eq('class_id', user.classId)
  if (error) {
    if (error.code === '23503') {
      return { error: `Môn "${row.name}" đang có trong thời khóa biểu. Cô hãy đổi các tiết đó sang môn khác trước khi xóa.` }
    }
    return { error: toVietnameseMessage('not_allowed') }
  }
  refresh()
  return {}
}

export async function exportTimetable(): Promise<{ error?: string; fileName?: string; base64?: string }> {
  const user = await requireTeacher()
  const supabase = await createServerSupabase()
  const [{ data: cls, error }, tt] = await Promise.all([
    supabase.from('classes').select('class_name').eq('id', user.classId).single(),
    getTimetable(user.classId),
  ])
  if (error || !cls) return { error: toVietnameseMessage('unknown') }
  const buf = buildTimetableWorkbook({ saturday: tt.saturday, slots: tt.slots, subjects: tt.subjects })
  return { fileName: timetableFileName(classShortName(cls.class_name)), base64: Buffer.from(buf).toString('base64') }
}
