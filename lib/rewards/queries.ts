import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveAvatars, signAvatarPaths, type AvatarValue } from '@/lib/avatars/resolve'
import { getRewardPreset } from './presets'

export type RewardView = {
  id: string
  name: string
  cost: number
  description: string
  stock: number
  held: number
  left: number
  hidden: boolean
  visual: { kind: 'preset'; key: string } | { kind: 'image'; url: string }
}

export type RewardRequestStatus = 'pending' | 'approved' | 'rejected' | 'delivered'

export type RewardRequestView = {
  id: string
  studentId: string
  studentName: string
  avatar: AvatarValue
  rewardName: string
  cost: number
  status: RewardRequestStatus
  createdAt: string
}

export async function getRewards(classId: string, opts: { includeHidden: boolean }): Promise<RewardView[]> {
  const supabase = await createServerSupabase()
  const [rewardsRes, heldRes] = await Promise.all([
    supabase
      .from('rewards')
      .select('id, name, cost, description, image_path, icon, stock, hidden')
      .eq('class_id', classId)
      .order('cost')
      .order('created_at'),
    supabase.from('reward_requests').select('reward_id').eq('class_id', classId).eq('status', 'pending'),
  ])
  for (const r of [rewardsRes, heldRes]) if (r.error) throw new Error(r.error.message)
  const rows = (rewardsRes.data ?? []).filter((r) => opts.includeHidden || !r.hidden)
  const heldBy = new Map<string, number>()
  for (const h of heldRes.data ?? []) heldBy.set(h.reward_id, (heldBy.get(h.reward_id) ?? 0) + 1)
  const urls = await signAvatarPaths(
    supabase,
    rows.map((r) => r.image_path).filter((p): p is string => !!p),
  )
  return rows.map((r) => {
    const held = heldBy.get(r.id) ?? 0
    const url = r.image_path ? urls.get(r.image_path) : undefined
    return {
      id: r.id,
      name: r.name,
      cost: r.cost,
      description: r.description,
      stock: r.stock,
      held,
      left: Math.max(r.stock - held, 0),
      hidden: r.hidden,
      visual: url ? { kind: 'image', url } : { kind: 'preset', key: getRewardPreset(r.icon)?.key ?? 'star' },
    }
  })
}

type RequestRow = {
  id: string
  student_id: string
  cost: number
  status: RewardRequestStatus
  created_at: string
  students: { full_name: string; avatar_id: string | null } | null
  rewards: { name: string } | null
}

const REQUEST_COLUMNS =
  'id, student_id, cost, status, created_at, students(full_name, avatar_id), rewards(name)'

/** Chờ duyệt trước (mọi yêu cầu chờ, không bị cắt bởi limit), rồi mới nhất trước. */
export async function getRewardRequests(classId: string, limit = 50): Promise<RewardRequestView[]> {
  const supabase = await createServerSupabase()
  const [pendingRes, recentRes] = await Promise.all([
    supabase
      .from('reward_requests')
      .select(REQUEST_COLUMNS)
      .eq('class_id', classId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('reward_requests')
      .select(REQUEST_COLUMNS)
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])
  for (const r of [pendingRes, recentRes]) if (r.error) throw new Error(r.error.message)
  const byId = new Map<string, RequestRow>()
  for (const r of [...(pendingRes.data ?? []), ...(recentRes.data ?? [])] as unknown as RequestRow[]) byId.set(r.id, r)
  const rows = [...byId.values()].sort((a, b) => {
    const pa = a.status === 'pending' ? 0 : 1
    const pb = b.status === 'pending' ? 0 : 1
    return pa - pb || b.created_at.localeCompare(a.created_at)
  })
  const avatars = await resolveAvatars(rows.map((r) => r.students?.avatar_id ?? null))
  return rows.map((r) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: r.students?.full_name ?? '',
    avatar: (r.students?.avatar_id && avatars.get(r.students.avatar_id)) || null,
    rewardName: r.rewards?.name ?? '',
    cost: r.cost,
    status: r.status,
    createdAt: r.created_at,
  }))
}
