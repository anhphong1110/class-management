import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveAvatars, type AvatarValue } from '@/lib/avatars/resolve'
import { groupBatches, type StarBatch, type TxRow } from './history'

export type StudentWithStars = {
  id: string
  fullName: string
  rollNo: number
  avatar: AvatarValue
  competition: number
  available: number
  groupId: string | null
}

export type StarCriterion = {
  id: string
  label: string
  kind: 'award' | 'penalty'
  defaultPoints: number
}

export type StarGroup = { id: string; name: string; memberIds: string[] }

const TX_COLUMNS = 'id, batch_id, student_id, delta, kind, criterion_id, note, reverses_id, actor_id, created_at'
const ROW_WINDOW = 500

export async function getStudentsWithStars(classId: string): Promise<StudentWithStars[]> {
  const supabase = await createServerSupabase()
  const [{ data: students }, { data: stars }, { data: members }] = await Promise.all([
    supabase
      .from('students')
      .select('id, full_name, roll_no, avatar_id')
      .eq('class_id', classId)
      .is('archived_at', null)
      .order('roll_no'),
    supabase.from('v_student_stars').select('student_id, competition_stars, available_stars').eq('class_id', classId),
    supabase.from('group_members').select('group_id, student_id').eq('class_id', classId),
  ])
  const rows = students ?? []
  const avatars = await resolveAvatars(rows.map((s) => s.avatar_id))
  const starsBy = new Map((stars ?? []).map((s) => [s.student_id as string, s]))
  const groupBy = new Map((members ?? []).map((m) => [m.student_id as string, m.group_id as string]))
  return rows.map((s) => ({
    id: s.id,
    fullName: s.full_name,
    rollNo: s.roll_no,
    avatar: (s.avatar_id && avatars.get(s.avatar_id)) || null,
    competition: starsBy.get(s.id)?.competition_stars ?? 0,
    available: starsBy.get(s.id)?.available_stars ?? 0,
    groupId: groupBy.get(s.id) ?? null,
  }))
}

export async function getGroups(classId: string): Promise<StarGroup[]> {
  const supabase = await createServerSupabase()
  const [{ data: groups }, { data: members }] = await Promise.all([
    supabase.from('groups').select('id, name').eq('class_id', classId).order('sort_order').order('name'),
    supabase.from('group_members').select('group_id, student_id').eq('class_id', classId),
  ])
  return (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    memberIds: (members ?? []).filter((m) => m.group_id === g.id).map((m) => m.student_id as string),
  }))
}

export async function getCriteria(classId: string): Promise<StarCriterion[]> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('star_criteria')
    .select('id, label, kind, default_points')
    .eq('class_id', classId)
    .is('archived_at', null)
    .order('sort_order')
    .order('created_at')
  return (data ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    kind: c.kind as 'award' | 'penalty',
    defaultPoints: c.default_points,
  }))
}

export async function getStarSteps(classId: string): Promise<number[]> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('class_settings').select('star_steps').eq('class_id', classId).maybeSingle()
  const steps = (data?.star_steps as number[] | null) ?? [1, 2, 3, 5, 10]
  return [...new Set(steps)].filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b)
}

export async function getRecentBatches(classId: string, limit: number): Promise<StarBatch[]> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('star_transactions')
    .select(TX_COLUMNS)
    .eq('class_id', classId)
    .in('kind', ['award', 'penalty', 'reversal'])
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(ROW_WINDOW)
  let rows = (data ?? []) as TxRow[]

  const order: string[] = []
  for (const r of rows) if (!order.includes(r.batch_id)) order.push(r.batch_id)
  // Khi chạm giới hạn dòng, batch cuối có thể bị cắt dở nên bỏ đi.
  const usable = rows.length >= ROW_WINDOW ? order.slice(0, -1) : order
  const wanted = new Set(usable.slice(0, limit))
  rows = rows.filter((r) => wanted.has(r.batch_id))

  // Batch hoàn tác cần lý do của batch gốc, có thể nằm ngoài cửa sổ.
  const have = new Set(rows.map((r) => r.id))
  const missing = [...new Set(rows.filter((r) => r.kind === 'reversal' && r.reverses_id).map((r) => r.reverses_id as string))].filter(
    (id) => !have.has(id),
  )
  if (missing.length) {
    const { data: originals } = await supabase.from('star_transactions').select(TX_COLUMNS).eq('class_id', classId).in('id', missing)
    rows = [...rows, ...((originals ?? []) as TxRow[])]
  }

  const criterionIds = [...new Set(rows.map((r) => r.criterion_id).filter((x): x is string => !!x))]
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x))]
  const [{ data: crit }, { data: actors }] = await Promise.all([
    criterionIds.length
      ? supabase.from('star_criteria').select('id, label').in('id', criterionIds)
      : Promise.resolve({ data: [] as { id: string; label: string }[] }),
    actorIds.length
      ? supabase.from('profiles').select('id, display_name').in('id', actorIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
  ])
  const labels = new Map((crit ?? []).map((c) => [c.id, c.label]))
  const names = new Map((actors ?? []).map((a) => [a.id, a.display_name]))
  // Batch gốc kéo thêm chỉ để lấy lý do, không hiện thành dòng lịch sử riêng.
  return groupBatches(rows, labels, names)
    .filter((b) => wanted.has(b.batchId))
    .slice(0, limit)
}
