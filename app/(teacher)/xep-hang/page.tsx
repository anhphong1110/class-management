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
  const hasTerm1 = !!(cls.term1_start && cls.term1_end)
  const hasTerm2 = !!(cls.term2_start && cls.term2_end)
  const inTerm2 = hasTerm2 && now.getTime() >= new Date(`${cls.term2_start}T00:00:00+07:00`).getTime()
  // Học kỳ chỉ có nghĩa khi biết ngày của học kỳ hiện tại; nếu không thì quay về "Cả năm" (và ghi đúng nhãn).
  const period: Period = requested === 'term' && !(inTerm2 || hasTerm1) ? 'year' : requested
  const { from, to } = periodRange(period, now, {
    term1Start: cls.term1_start ?? '',
    term1End: cls.term1_end ?? '',
    term2Start: hasTerm2 ? cls.term2_start! : '9999-12-31',
    term2End: cls.term2_end ?? '9999-12-31',
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
