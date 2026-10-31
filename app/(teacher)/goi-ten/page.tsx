import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { requireTeacher } from '@/lib/auth/session'
import { todayInVietnam } from '@/lib/domain/date'
import { createServerSupabase } from '@/lib/supabase/server'
import { getGroups } from '@/lib/stars/queries'
import { getStudentCards } from '@/lib/students/queries'
import { isPresentToday } from '@/lib/random/pick'
import { RandomClient } from './RandomClient'

export default async function Page() {
  const user = await requireTeacher()
  const supabase = await createServerSupabase()
  const { data: settings, error } = await supabase.from('class_settings').select('feature_random').eq('class_id', user.classId).maybeSingle()
  if (error) throw new Error(error.message)
  const header = <Header title="Gọi tên ngẫu nhiên" subtitle="Quay số chọn phi hành gia may mắn" />
  if (!(settings?.feature_random ?? true)) {
    return (
      <>
        {header}
        <Card>
          <p className="m-0 font-bold">Tính năng này đang tắt. Cô bật lại trong Cài đặt.</p>
        </Card>
      </>
    )
  }
  const [cards, groups] = await Promise.all([getStudentCards(user.classId), getGroups(user.classId)])
  return (
    <>
      {header}
      <RandomClient
        today={todayInVietnam()}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        students={cards.map((s) => ({
          id: s.id,
          fullName: s.fullName,
          code: s.code,
          avatar: s.avatar,
          groupId: s.groupId,
          groupName: s.groupName,
          // Chưa có dòng điểm danh hôm nay thì tính là có mặt.
          presentToday: isPresentToday(s.today),
        }))}
      />
    </>
  )
}
