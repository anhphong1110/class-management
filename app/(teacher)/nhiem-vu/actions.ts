'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'

type Result = { error?: string; message?: string }

// guid: `z.uuid()` của Zod 4 đòi đúng phiên bản RFC, còn id seed thì không có.
const uuid = z.guid()
const missionInput = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(120),
  period: z.enum(['day', 'week', 'month', 'term']),
  condition: z.string().trim().min(1).max(300),
  /** Tối đa 100 sao, bằng giới hạn một lần cộng sao. */
  rewardStars: z.number().int().min(0).max(100),
})

function refresh() {
  revalidatePath('/nhiem-vu')
  revalidatePath('/thi-dua')
  revalidatePath('/xep-hang')
  revalidatePath('/tong-quan')
}

function invalid(): Result {
  return { error: toVietnameseMessage('invalid_input') }
}

export async function saveMission(raw: unknown): Promise<Result & { id?: string }> {
  const user = await requireTeacher()
  const parsed = missionInput.safeParse(raw)
  if (!parsed.success) {
    const r = (raw ?? {}) as { name?: unknown; condition?: unknown }
    const blank = (v: unknown) => typeof v !== 'string' || !v.trim()
    return blank(r.name) || blank(r.condition) ? { error: toVietnameseMessage('mission_required') } : invalid()
  }
  const { id, name, period, condition, rewardStars } = parsed.data
  const supabase = await createServerSupabase()
  if (!id) {
    const { data, error } = await supabase
      .from('missions')
      .insert({ class_id: user.classId, name, period, condition, reward_stars: rewardStars })
      .select('id')
      .single()
    if (error || !data) return { error: toVietnameseMessage(error?.message ?? 'not_allowed') }
    refresh()
    return { id: data.id, message: 'Đã thêm nhiệm vụ mới.' }
  }
  const { data, error } = await supabase
    .from('missions')
    .update({ name, period, condition, reward_stars: rewardStars })
    .eq('id', id)
    .select('id')
  if (error) return { error: toVietnameseMessage(error.message) }
  if (!data?.length) return { error: toVietnameseMessage('mission_not_found') }
  refresh()
  return { id, message: 'Đã lưu nhiệm vụ.' }
}

export async function toggleMission(id: string): Promise<Result> {
  await requireTeacher()
  if (!uuid.safeParse(id).success) return invalid()
  const supabase = await createServerSupabase()
  const { data: row, error: readError } = await supabase.from('missions').select('active').eq('id', id).maybeSingle()
  if (readError) throw new Error(readError.message)
  if (!row) return { error: toVietnameseMessage('mission_not_found') }
  const { data, error } = await supabase.from('missions').update({ active: !row.active }).eq('id', id).select('id')
  if (error) return { error: toVietnameseMessage(error.message) }
  if (!data?.length) return { error: toVietnameseMessage('mission_not_found') }
  refresh()
  return {}
}

export async function completeMission(missionId: string, studentId: string): Promise<Result> {
  await requireTeacher()
  if (!uuid.safeParse(missionId).success || !uuid.safeParse(studentId).success) return invalid()
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('complete_mission', { p_mission_id: missionId, p_student_id: studentId })
  if (error) return { error: toVietnameseMessage(error.message) }
  refresh()
  return {}
}

export async function awardBadge(badgeId: string, studentId: string): Promise<Result> {
  await requireTeacher()
  if (!uuid.safeParse(badgeId).success || !uuid.safeParse(studentId).success) return invalid()
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('award_badge', { p_badge_id: badgeId, p_student_id: studentId })
  if (error) return { error: toVietnameseMessage(error.message) }
  refresh()
  return {}
}

export async function revokeBadge(badgeId: string, studentId: string): Promise<Result> {
  await requireTeacher()
  if (!uuid.safeParse(badgeId).success || !uuid.safeParse(studentId).success) return invalid()
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('revoke_badge', { p_badge_id: badgeId, p_student_id: studentId })
  if (error) return { error: toVietnameseMessage(error.message) }
  refresh()
  return {}
}

export async function setFeatureMissions(on: boolean): Promise<Result> {
  const user = await requireTeacher()
  if (typeof on !== 'boolean') return invalid()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('class_settings')
    .update({ feature_missions: on })
    .eq('class_id', user.classId)
    .select('class_id')
  if (error) return { error: toVietnameseMessage(error.message) }
  if (!data?.length) return { error: toVietnameseMessage('not_allowed') }
  refresh()
  return {}
}
