import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveAvatars, type AvatarValue } from '@/lib/avatars/resolve'
import { periodRange } from '@/lib/domain/period'
import { todayInVietnam } from '@/lib/domain/date'
import { joinNames } from '@/lib/domain/names'
import { formatRelative } from '@/lib/domain/relative-time'
import { getRecentBatches, getStudentsWithStars } from '@/lib/stars/queries'
import { buildOverviewStats, type AttendanceCounts, type OverviewStat } from './stats'

export { buildOverviewStats } from './stats'

export type Top3Row = { id: string; name: string; stars: number; rank: number; avatar: AvatarValue }
export type ActivityItem = {
  key: string
  at: string
  kind: 'award' | 'penalty' | 'reversal' | 'request'
  delta: number | null
  text: string
  meta: string
}
export type NewsItem = { id: string; type: string; title: string; body: string; publishedAt: string }

export type OverviewData = {
  teacherName: string
  coverUrl: string | null
  stats: OverviewStat[]
  top3: Top3Row[]
  activity: ActivityItem[]
  news: NewsItem[]
}

type LbRow = { student_id: string; full_name: string; avatar_id: string | null; stars: number | string; rank: number | string }

const NO_TERMS = { term1Start: '', term1End: '', term2Start: '', term2End: '' }

export async function getOverview(classId: string, now: Date = new Date()): Promise<OverviewData> {
  const supabase = await createServerSupabase()
  const { from, to } = periodRange('week', now, NO_TERMS)

  const [students, cls, att, week, reqs, lb, news, batches] = await Promise.all([
    getStudentsWithStars(classId),
    supabase.from('classes').select('teacher_name, cover_path').eq('id', classId).single(),
    supabase.from('attendance').select('status').eq('class_id', classId).eq('date', todayInVietnam(now)),
    supabase
      .from('star_transactions')
      .select('kind, delta')
      .eq('class_id', classId)
      .in('kind', ['award', 'penalty'])
      .gte('created_at', from!)
      .lt('created_at', to!),
    supabase
      .from('reward_requests')
      .select('id, student_id, reward_id, status, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false }),
    supabase.rpc('leaderboard_between', { p_from: null, p_to: null }),
    supabase
      .from('announcements')
      .select('id, title, type, body, pinned, published_at')
      .eq('class_id', classId)
      .is('archived_at', null)
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(3),
    getRecentBatches(classId, 5),
  ])
  if (cls.error) throw new Error(cls.error.message)
  if (lb.error) throw new Error(lb.error.message)

  const attendanceToday: AttendanceCounts = { present: 0, late: 0, absent_excused: 0, absent_unexcused: 0 }
  for (const r of att.data ?? []) attendanceToday[r.status as keyof AttendanceCounts]++

  let weekAwarded = 0
  let weekPenalized = 0
  for (const t of week.data ?? []) {
    if (t.kind === 'award') weekAwarded += t.delta
    else weekPenalized += Math.abs(t.delta)
  }

  const requests = reqs.data ?? []
  const redeemedCount = requests.filter((r) => r.status === 'approved' || r.status === 'delivered').length
  const pending = requests.filter((r) => r.status === 'pending')

  const stats = buildOverviewStats({
    studentCount: students.length,
    attendanceToday,
    weekAwarded,
    weekPenalized,
    redeemedCount,
    pendingRewards: pending.length,
    starsOver100: students.filter((s) => s.competition >= 100).length,
  })

  // Tên học sinh (kể cả bạn đã lưu trữ) và tên quà cho dòng hoạt động.
  const recentPending = pending.slice(0, 5)
  const studentIds = [...new Set([...batches.flatMap((b) => b.studentIds), ...recentPending.map((r) => r.student_id)])]
  const rewardIds = [...new Set(recentPending.map((r) => r.reward_id))]
  const [{ data: nameRows }, { data: rewardRows }] = await Promise.all([
    studentIds.length
      ? supabase.from('students').select('id, full_name').in('id', studentIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    rewardIds.length
      ? supabase.from('rewards').select('id, name').in('id', rewardIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])
  const names = new Map((nameRows ?? []).map((s) => [s.id, s.full_name]))
  const rewardNames = new Map((rewardRows ?? []).map((r) => [r.id, r.name]))

  const activity: ActivityItem[] = [
    ...batches.map((b): ActivityItem => {
      const who = joinNames(b.studentIds.map((id) => names.get(id) ?? 'Một bạn'))
      return {
        key: `b-${b.batchId}`,
        at: b.at,
        kind: b.kind,
        delta: b.delta,
        text: b.reason ? `${who} – ${b.reason}` : who,
        meta: `${b.actorName} · ${formatRelative(new Date(b.at), now)}`,
      }
    }),
    ...recentPending.map(
      (r): ActivityItem => ({
        key: `r-${r.id}`,
        at: r.created_at,
        kind: 'request',
        delta: null,
        text: `${names.get(r.student_id) ?? 'Một bạn'} gửi yêu cầu đổi ${rewardNames.get(r.reward_id) ?? 'quà'}`,
        meta: `Chờ duyệt · ${formatRelative(new Date(r.created_at), now)}`,
      }),
    ),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 5)

  const top3Rows = ((lb.data ?? []) as LbRow[]).slice(0, 3)
  const avatars = await resolveAvatars(top3Rows.map((r) => r.avatar_id))
  const top3: Top3Row[] = top3Rows.map((r) => ({
    id: r.student_id,
    name: r.full_name,
    stars: Number(r.stars),
    rank: Number(r.rank),
    avatar: (r.avatar_id && avatars.get(r.avatar_id)) || null,
  }))

  let coverUrl: string | null = null
  if (cls.data.cover_path) {
    const { data: signed } = await supabase.storage.from('class-media').createSignedUrl(cls.data.cover_path, 3600)
    coverUrl = signed?.signedUrl ?? null
  }

  return {
    teacherName: cls.data.teacher_name,
    coverUrl,
    stats,
    top3,
    activity,
    news: (news.data ?? []).map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, publishedAt: n.published_at })),
  }
}
