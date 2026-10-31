import { requireTeacher } from '@/lib/auth/session'
import { getClassHeaderInfo } from '@/lib/classes/queries'
import { todayInVietnam } from '@/lib/domain/date'
import { getTimetable } from '@/lib/timetable/queries'
import { Header } from '@/components/layout/Header'
import { TimetableClient } from './TimetableClient'

export default async function Page() {
  const user = await requireTeacher()
  const [info, tt] = await Promise.all([getClassHeaderInfo(user.classId), getTimetable(user.classId)])
  // 0 = Chủ Nhật; ngày tính theo giờ Việt Nam.
  const todayWeekday = new Date(`${todayInVietnam()}T00:00:00Z`).getUTCDay()
  return (
    <>
      <Header title="Lịch bay của phi hành gia" subtitle={`Thời khóa biểu lớp ${info.short}${info.term ? ` · Học kỳ ${info.term}` : ''}`} />
      <TimetableClient
        subjects={tt.subjects}
        slots={tt.slots}
        saturday={tt.saturday}
        todayWeekday={todayWeekday}
      />
    </>
  )
}
