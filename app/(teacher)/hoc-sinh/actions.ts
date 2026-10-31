'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { formatDayLabel } from '@/lib/domain/relative-time'
import { groupBatches, type TxRow } from '@/lib/stars/history'

type Result = { error?: string }

const uuid = z.guid()
const name = z.string().trim().min(1, 'name_required').max(200)
const rollNo = z.number().int().min(1).max(9999)

const createInput = z.object({ fullName: name, rollNo: rollNo.nullable() })
const updateInput = z.object({ id: uuid, fullName: name, rollNo })

function firstError(e: z.ZodError): string {
  const issue = e.issues[0]
  if (issue?.message === 'name_required') return toVietnameseMessage('name_required')
  if (issue?.path[0] === 'rollNo') return toVietnameseMessage('invalid_roll_no')
  return toVietnameseMessage('student_not_found')
}

function refresh() {
  revalidatePath('/hoc-sinh')
  revalidatePath('/thi-dua')
  revalidatePath('/xep-hang')
}

export async function createStudent(input: { fullName: string; rollNo: number | null }): Promise<Result> {
  const user = await requireTeacher()
  const parsed = createInput.safeParse(input)
  if (!parsed.success) return { error: firstError(parsed.error) }
  const supabase = await createServerSupabase()

  let roll = parsed.data.rollNo
  if (roll === null) {
    const { data: last } = await supabase
      .from('students')
      .select('roll_no')
      .eq('class_id', user.classId)
      .order('roll_no', { ascending: false })
      .limit(1)
      .maybeSingle()
    roll = (last?.roll_no ?? 0) + 1
  }

  // Hai lần thêm cùng lúc có thể sinh trùng mã; ràng buộc duy nhất sẽ chặn, nên thử lại vài lần.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: code, error: codeError } = await supabase.rpc('next_student_code', { p_class_id: user.classId })
    if (codeError || !code) return { error: toVietnameseMessage(codeError?.message ?? 'not_allowed') }
    const { error } = await supabase
      .from('students')
      .insert({ class_id: user.classId, code, roll_no: roll, full_name: parsed.data.fullName })
    if (!error) {
      refresh()
      return {}
    }
    if (error.code !== '23505') return { error: toVietnameseMessage('not_allowed') }
  }
  return { error: toVietnameseMessage('unknown') }
}

export async function updateStudent(input: { id: string; fullName: string; rollNo: number }): Promise<Result> {
  const user = await requireTeacher()
  const parsed = updateInput.safeParse(input)
  if (!parsed.success) return { error: firstError(parsed.error) }
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('students')
    .update({ full_name: parsed.data.fullName, roll_no: parsed.data.rollNo })
    .eq('id', parsed.data.id)
    .eq('class_id', user.classId)
    .is('archived_at', null)
    .select('id')
  if (error || !data?.length) return { error: toVietnameseMessage('student_not_found') }
  refresh()
  return {}
}

export async function archiveStudent(id: string): Promise<Result> {
  const user = await requireTeacher()
  if (!uuid.safeParse(id).success) return { error: toVietnameseMessage('student_not_found') }
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('students')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('class_id', user.classId)
    .is('archived_at', null)
    .select('id')
  if (error || !data?.length) return { error: toVietnameseMessage('student_not_found') }
  refresh()
  return {}
}

export type ProfileDetail = {
  rank: number | null
  attendanceRate: string
  history: { key: string; delta: number; text: string; date: string }[]
  badges: { id: string; name: string; icon: string }[]
  gifts: { id: string; name: string; date: string; status: string }[]
}

const GIFT_STATUS: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  delivered: 'Đã nhận',
}

const TX_COLUMNS = 'id, batch_id, student_id, delta, kind, criterion_id, note, reverses_id, actor_id, created_at'

export async function loadProfile(id: string): Promise<{ error?: string; detail?: ProfileDetail }> {
  const user = await requireTeacher()
  if (!uuid.safeParse(id).success) return { error: toVietnameseMessage('student_not_found') }
  const supabase = await createServerSupabase()
  const now = new Date()

  const [lb, att, tx, badges, gifts] = await Promise.all([
    supabase.rpc('leaderboard_between', { p_from: null, p_to: null }),
    supabase.from('attendance').select('status').eq('class_id', user.classId).eq('student_id', id),
    supabase
      .from('star_transactions')
      .select(TX_COLUMNS)
      .eq('class_id', user.classId)
      .eq('student_id', id)
      .in('kind', ['award', 'penalty', 'reversal'])
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(8),
    supabase
      .from('student_badges')
      .select('id, badges(name, icon)')
      .eq('class_id', user.classId)
      .eq('student_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('reward_requests')
      .select('id, status, created_at, rewards(name)')
      .eq('class_id', user.classId)
      .eq('student_id', id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])
  if (lb.error) return { error: toVietnameseMessage('unknown') }

  const rankRow = ((lb.data ?? []) as { student_id: string; rank: number | string }[]).find((r) => r.student_id === id)

  const attRows = att.data ?? []
  const attended = attRows.filter((a) => a.status === 'present' || a.status === 'late').length
  const attendanceRate = attRows.length ? `${Math.round((attended / attRows.length) * 100)}%` : '—'

  let rows = (tx.data ?? []) as TxRow[]
  const have = new Set(rows.map((r) => r.id))
  const missing = [...new Set(rows.filter((r) => r.kind === 'reversal' && r.reverses_id).map((r) => r.reverses_id as string))].filter(
    (x) => !have.has(x),
  )
  if (missing.length) {
    const { data: originals } = await supabase.from('star_transactions').select(TX_COLUMNS).eq('class_id', user.classId).in('id', missing)
    rows = [...rows, ...((originals ?? []) as TxRow[])]
  }
  const criterionIds = [...new Set(rows.map((r) => r.criterion_id).filter((x): x is string => !!x))]
  const { data: crit } = criterionIds.length
    ? await supabase.from('star_criteria').select('id, label').in('id', criterionIds)
    : { data: [] as { id: string; label: string }[] }
  const labels = new Map((crit ?? []).map((c) => [c.id, c.label]))
  const shownIds = new Set((tx.data ?? []).map((r) => r.batch_id as string))
  const history = groupBatches(rows, labels, new Map())
    .filter((b) => shownIds.has(b.batchId))
    .map((b) => ({
      key: b.batchId,
      delta: b.delta,
      text: b.reason || (b.delta >= 0 ? 'Cộng sao' : 'Trừ sao'),
      date: formatDayLabel(new Date(b.at), now),
    }))

  type BadgeRow = { id: string; badges: { name: string; icon: string } | { name: string; icon: string }[] | null }
  type GiftRow = { id: string; status: string; created_at: string; rewards: { name: string } | { name: string }[] | null }
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v)

  return {
    detail: {
      rank: rankRow ? Number(rankRow.rank) : null,
      attendanceRate,
      history,
      badges: ((badges.data ?? []) as unknown as BadgeRow[]).flatMap((b) => {
        const x = one(b.badges)
        return x ? [{ id: b.id, name: x.name, icon: x.icon }] : []
      }),
      gifts: ((gifts.data ?? []) as unknown as GiftRow[]).map((g) => ({
        id: g.id,
        name: one(g.rewards)?.name ?? 'Quà tặng',
        date: formatDayLabel(new Date(g.created_at), now),
        status: GIFT_STATUS[g.status] ?? g.status,
      })),
    },
  }
}
