import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveAvatars } from '@/lib/avatars/resolve'
import { periodRange, type Period } from '@/lib/domain/period'
import { LeaderboardClient, type RankRow } from './LeaderboardClient'

type LbRow = { student_id: string; full_name: string; avatar_id: string | null; roll_no: number; stars: number | string; rank: number | string }

const PERIODS: Period[] = ['week', 'month', 'term', 'year']

export default async function Page({ searchParams }: { searchParams: Promise<{ ky?: string; 'tat-ca'?: string }> }) {
  const user = await requireTeacher()
  const sp = await searchParams
  const period: Period = PERIODS.find((p) => p === sp.ky) ?? 'year'
  const showAll = sp['tat-ca'] === '1'

  const supabase = await createServerSupabase()
  const { data: cls } = await supabase
    .from('classes')
    .select('term1_start, term1_end, term2_start, term2_end')
    .eq('id', user.classId)
    .single()
  const hasTerms = !!(cls?.term1_start && cls.term1_end && cls.term2_start && cls.term2_end)
  const { from, to } =
    period === 'term' && !hasTerms
      ? { from: null, to: null }
      : periodRange(period, new Date(), {
          term1Start: cls?.term1_start ?? '',
          term1End: cls?.term1_end ?? '',
          term2Start: cls?.term2_start ?? '',
          term2End: cls?.term2_end ?? '',
        })

  const { data } = await supabase.rpc('leaderboard_between', { p_from: from, p_to: to })
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
      <Header title="Bảng xếp hạng" subtitle="Xếp theo sao thi đua, không tính sao đã dùng đổi quà" />
      <LeaderboardClient rows={rows} period={period} showAll={showAll} />
    </>
  )
}
