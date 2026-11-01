'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { joinNames } from '@/lib/domain/names'
import { allBlockedByReservation } from '@/lib/stars/undo'

type Result = { error?: string; message?: string }

// guid: `z.uuid()` của Zod 4 đòi đúng phiên bản RFC, còn id seed (…0b0001) thì không có.
const uuid = z.guid()
const starInput = z.object({
  studentIds: z.array(uuid).min(1).max(200),
  points: z.number().int().min(1).max(100),
  criterionId: uuid.nullable(),
  note: z.string().max(200),
})
const criterionInput = z.object({
  id: uuid.optional(),
  kind: z.enum(['award', 'penalty']),
  label: z.string().trim().min(1).max(200),
  defaultPoints: z.number().int().min(1).max(100),
})

function refresh() {
  revalidatePath('/thi-dua')
}

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>

/** Tên học sinh theo thứ tự số báo danh. */
async function namesOf(supabase: Supabase, ids: string[]): Promise<string[]> {
  const valid = ids.filter((i) => uuid.safeParse(i).success)
  if (!valid.length) return []
  const { data } = await supabase.from('students').select('full_name').in('id', valid).order('roll_no')
  return (data ?? []).map((s) => s.full_name)
}

async function change(rpcName: 'award_stars' | 'penalize_stars', raw: unknown): Promise<Result> {
  await requireTeacher()
  const parsed = starInput.safeParse(raw)
  if (!parsed.success) {
    const missingStudents = Array.isArray((raw as { studentIds?: unknown })?.studentIds) && (raw as { studentIds: unknown[] }).studentIds.length === 0
    return { error: toVietnameseMessage(missingStudents ? 'no_students' : 'invalid_points') }
  }
  const { studentIds, points, criterionId, note } = parsed.data
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc(rpcName, {
    p_student_ids: studentIds,
    p_points: points,
    p_criterion_id: criterionId,
    p_note: note,
  })
  if (error) {
    if (error.message === 'insufficient_stars') {
      const names = await namesOf(supabase, (error.details ?? '').split(','))
      return {
        error: names.length
          ? `Không đủ sao khả dụng để trừ: ${joinNames(names)}. Cô hãy giảm số sao hoặc xử lý riêng.`
          : toVietnameseMessage('insufficient_stars'),
      }
    }
    return { error: toVietnameseMessage(error.message) }
  }
  const names = await namesOf(supabase, studentIds)
  refresh()
  const verb = rpcName === 'award_stars' ? 'cộng' : 'trừ'
  return { message: `Đã ${verb} ${points} sao cho ${joinNames(names)}.` }
}

export async function awardStars(input: {
  studentIds: string[]
  points: number
  criterionId: string | null
  note: string
}): Promise<Result> {
  return change('award_stars', input)
}

export async function penalizeStars(input: {
  studentIds: string[]
  points: number
  criterionId: string | null
  note: string
}): Promise<Result> {
  return change('penalize_stars', input)
}

/** Các bạn thiếu sao để hoàn tác có thiếu chỉ vì sao đang được giữ cho yêu cầu đổi quà đang chờ không. */
async function shortOnlyBecauseOfHold(supabase: Supabase, batchId: string, studentIds: string[]): Promise<boolean> {
  if (!studentIds.length) return false
  const [ledgerRes, pendingRes] = await Promise.all([
    supabase.from('star_transactions').select('student_id, delta, kind, batch_id, reward_request_id').in('student_id', studentIds),
    supabase.from('reward_requests').select('id').in('student_id', studentIds).eq('status', 'pending'),
  ])
  for (const r of [ledgerRes, pendingRes]) if (r.error) throw new Error(r.error.message)
  const pending = new Set((pendingRes.data ?? []).map((r) => r.id))
  const per = new Map(studentIds.map((id) => [id, { available: 0, held: 0, needed: 0 }]))
  for (const t of ledgerRes.data ?? []) {
    const p = per.get(t.student_id)
    if (!p) continue
    p.available += t.delta
    if (t.kind === 'reserve' && t.reward_request_id && pending.has(t.reward_request_id)) p.held -= t.delta
    if (t.kind === 'award' && t.batch_id === batchId) p.needed += t.delta
  }
  return allBlockedByReservation([...per.values()])
}

export async function undoBatch(batchId: string): Promise<Result> {
  await requireTeacher()
  if (!uuid.safeParse(batchId).success) return { error: toVietnameseMessage('batch_not_found') }
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('reverse_batch', { p_batch_id: batchId })
  if (error) {
    if (error.message === 'insufficient_stars') {
      const shortIds = (error.details ?? '').split(',').filter((i) => uuid.safeParse(i).success)
      if (await shortOnlyBecauseOfHold(supabase, batchId, shortIds)) {
        return { error: 'Không hoàn tác được: một phần sao đang được giữ cho yêu cầu đổi quà.' }
      }
      const names = await namesOf(supabase, shortIds)
      return {
        error: names.length
          ? `Không thể hoàn tác vì ${joinNames(names)} không đủ sao khả dụng.`
          : toVietnameseMessage('insufficient_stars'),
      }
    }
    return { error: toVietnameseMessage(error.message) }
  }
  refresh()
  return { message: 'Đã hoàn tác. Hệ thống ghi thêm một bản ghi mới, bản ghi cũ vẫn được giữ.' }
}

export async function saveCriterion(input: {
  id?: string
  kind: 'award' | 'penalty'
  label: string
  defaultPoints: number
}): Promise<Result> {
  const user = await requireTeacher()
  const parsed = criterionInput.safeParse(input)
  if (!parsed.success) return { error: toVietnameseMessage('invalid_points') }
  const { id, kind, label, defaultPoints } = parsed.data
  const supabase = await createServerSupabase()

  if (id) {
    const { data, error } = await supabase
      .from('star_criteria')
      .update({ label, default_points: defaultPoints })
      .eq('id', id)
      .eq('class_id', user.classId)
      .select('id')
    if (error || !data?.length) return { error: toVietnameseMessage('criterion_mismatch') }
  } else {
    const { data: last } = await supabase
      .from('star_criteria')
      .select('sort_order')
      .eq('class_id', user.classId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const { error } = await supabase.from('star_criteria').insert({
      class_id: user.classId,
      kind,
      label,
      default_points: defaultPoints,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    if (error) return { error: toVietnameseMessage('not_allowed') }
  }
  refresh()
  return {}
}

export async function archiveCriterion(id: string): Promise<Result> {
  const user = await requireTeacher()
  if (!uuid.safeParse(id).success) return { error: toVietnameseMessage('criterion_mismatch') }
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('star_criteria')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('class_id', user.classId)
    .select('id')
  if (error || !data?.length) return { error: toVietnameseMessage('criterion_mismatch') }
  refresh()
  return {}
}
