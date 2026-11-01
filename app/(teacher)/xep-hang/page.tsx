import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveAvatars } from '@/lib/avatars/resolve'
import { periodRange, resolvePeriod, type Period } from '@/lib/domain/period'
import { LeaderboardClient, type RankRow } from './LeaderboardClient'
import type { LbRow as BaseLbRow } from '@/lib/stars/leaderboard-row'

type LbRow = BaseLbRow & { roll_no: number }

const PERIODS: Period[] = ['week', 'month', 'term', 'year']

export default async function Page({ searchParams }: { searchParams: Promise<{ ky?: string; 'tat-ca'?: string }> }) {
  const user = await requireTeacher()
  const sp = await searchParams
  const requested: Period = PERIODS.find((p) => p === sp.ky) ?? 'year'
  const showAll = sp['tat-ca'] === '1'

  const supabase = await createServerSupabase()
  const { data: cls, error: clsError } = await supabase
    .from('classes')
    .select('term1_start, term1_end, term2_start, term2_end')
    .eq('id', user.classId)
    .single()
  if (clsError) throw new Error(clsError.message)

  const now = new Date()
  const { period, term } = resolvePeriod(requested, now, {
    term1Start: cls.term1_start,
    term1End: cls.term1_end,
    term2Start: cls.term2_start,
    term2End: cls.term2_end,
  })
  const { from, to } = periodRange(period, now, {
    term1Start: cls.term1_start ?? '',
    term1End: cls.term1_end ?? '',
    // Khi thiếu ngày học kỳ 2, đẩy mốc ra xa để periodRange luôn chọn học kỳ 1.
    term2Start: term === 2 ? cls.term2_start! : '9999-12-31',
    term2End: term === 2 ? cls.term2_end! : '9999-12-31',
  })

  const { data, error } = await supabase.rpc('leaderboard_between', { p_from: from, p_to: to })
  if (error) throw new Error(error.message)
  const list = (data ?? []) as LbRow[]
  const avatars = await resolveAvatars(list.map((r) => r.avatar_id))
  const rows: RankRow[] = list.map((r) => ({
    id: r.student_id,
    name: r.full_name,
    stars: Number(r.stars),
    rank: Number(r.rank),
    avatar: (r.avatar_id && avatars.get(r.avatar_id)) || null,
  }))

  return (
    <>
      <Header title="Bảng xếp hạng phi hành gia xuất sắc" subtitle="Xếp theo sao thi đua, không tính sao đã dùng đổi quà" />
      <LeaderboardClient rows={rows} period={period} showAll={showAll} />
    </>
  )
}
