'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { formatDayLabel } from '@/lib/domain/relative-time'
import { classShortName } from '@/lib/classes/short-name'
import { buildStudentWorkbook, exportFileName } from '@/lib/students/export'
import { getStudentCards } from '@/lib/students/queries'
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

  // Hai lần thêm cùng lúc có thể sinh trùng mã hoặc số thứ tự; ràng buộc duy nhất sẽ chặn, nên tính lại và thử vài lần.
  for (let attempt = 0; attempt < 3; attempt++) {
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
    const { data: code, error: codeError } = await supabase.rpc('next_student_code', { p_class_id: user.classId })
    if (codeError || !code) return { error: toVietnameseMessage(codeError?.message ?? 'not_allowed') }
    const { error } = await supabase
      .from('students')
      .insert({ class_id: user.classId, code, roll_no: roll, full_name: parsed.data.fullName })
    if (!error) {
      refresh()
      return {}
    }
    if (error.code !== '23505') return { error: toVietnameseMessage('unknown') }
  }
  return { error: toVietnameseMessage('unknown') }
}

const importInput = z
  .array(z.object({ rollNo: rollNo.nullable(), fullName: name, code: z.string().trim().max(200).nullable() }))
  .min(1, 'invalid_rows')
  .max(500, 'invalid_rows')

export async function importStudents(rows: { rollNo: number | null; fullName: string; code: string | null }[]): Promise<{ error?: string; created?: number }> {
  await requireTeacher()
  const parsed = importInput.safeParse(rows)
  if (!parsed.success) return { error: toVietnameseMessage(parsed.error.issues[0]?.message === 'invalid_rows' ? 'invalid_rows' : 'name_required') }
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('import_students', {
    p_rows: parsed.data.map((r) => ({ roll_no: r.rollNo, full_name: r.fullName, code: r.code || null })),
  })
  if (error) return { error: toVietnameseMessage(error.code === '23505' ? 'import_conflict' : error.message) }
  refresh()
  return { created: Number(data) }
}

export async function exportStudents(): Promise<{ error?: string; fileName?: string; base64?: string }> {
  const user = await requireTeacher()
  const supabase = await createServerSupabase()
  const [{ data: cls, error }, students] = await Promise.all([
    supabase.from('classes').select('class_name').eq('id', user.classId).single(),
    getStudentCards(user.classId),
  ])
  if (error || !cls) return { error: toVietnameseMessage('unknown') }
  const sorted = [...students].sort((a, b) => a.rollNo - b.rollNo)
  const buf = buildStudentWorkbook(
    sorted.map((s) => ({
      code: s.code,
      rollNo: s.rollNo,
      fullName: s.fullName,
      groupName: s.groupName ?? '',
      competition: s.competition,
      available: s.available,
    })),
  )
  return { fileName: exportFileName(classShortName(cls.class_name)), base64: Buffer.from(buf).toString('base64') }
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
  // Học sinh đã lưu trữ không còn xuất hiện trong thẻ tổ.
  const { error: memberError } = await supabase.from('group_members').delete().eq('class_id', user.classId).eq('student_id', id)
  if (memberError) {
    refresh()
    return { error: toVietnameseMessage('unknown') }
  }
  refresh()
  return {}
}

const groupRoleInput = z.enum(['leader', 'deputy', 'member'])
const groupName = z.string().trim().min(1).max(200)

async function groupRpc(fn: 'set_group_role' | 'move_student_to_group' | 'delete_group' | 'create_group', args: Record<string, unknown>): Promise<Result> {
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc(fn, args as never)
  if (error) return { error: toVietnameseMessage(error.message) }
  revalidatePath('/hoc-sinh')
  revalidatePath('/thi-dua')
  return {}
}

export async function setGroupRole(studentId: string, role: 'leader' | 'deputy' | 'member'): Promise<Result> {
  await requireTeacher()
  if (!uuid.safeParse(studentId).success || !groupRoleInput.safeParse(role).success) return { error: toVietnameseMessage('student_not_found') }
  return groupRpc('set_group_role', { p_student_id: studentId, p_role: role })
}

export async function moveStudent(studentId: string, groupId: string): Promise<Result> {
  await requireTeacher()
  if (!uuid.safeParse(studentId).success || !uuid.safeParse(groupId).success) return { error: toVietnameseMessage('student_not_found') }
  return groupRpc('move_student_to_group', { p_student_id: studentId, p_group_id: groupId })
}

export async function createGroup(name: string): Promise<Result> {
  await requireTeacher()
  const parsed = groupName.safeParse(name)
  if (!parsed.success) return { error: toVietnameseMessage('group_name_required') }
  return groupRpc('create_group', { p_name: parsed.data })
}

export async function deleteGroup(groupId: string): Promise<Result> {
  await requireTeacher()
  if (!uuid.safeParse(groupId).success) return { error: toVietnameseMessage('not_allowed') }
  return groupRpc('delete_group', { p_group_id: groupId })
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
  if (lb.error || att.error || tx.error || badges.error || gifts.error) return { error: toVietnameseMessage('unknown') }

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
    const { data: originals, error: origError } = await supabase.from('star_transactions').select(TX_COLUMNS).eq('class_id', user.classId).in('id', missing)
    if (origError) return { error: toVietnameseMessage('unknown') }
    rows = [...rows, ...((originals ?? []) as TxRow[])]
  }
  const criterionIds = [...new Set(rows.map((r) => r.criterion_id).filter((x): x is string => !!x))]
  const { data: crit, error: critError } = criterionIds.length
    ? await supabase.from('star_criteria').select('id, label').in('id', criterionIds)
    : { data: [] as { id: string; label: string }[], error: null }
  if (critError) return { error: toVietnameseMessage('unknown') }
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
