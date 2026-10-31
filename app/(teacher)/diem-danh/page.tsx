import { requireTeacher } from '@/lib/auth/session'
import { formatVietnameseDate, todayInVietnam } from '@/lib/domain/date'
import { getDay, getMonth, getRecentDays } from '@/lib/attendance/queries'
import { getStudentsWithStars } from '@/lib/stars/queries'
import { Header } from '@/components/layout/Header'
import { AttendanceClient } from './AttendanceClient'

const DAY = /^\d{4}-\d{2}-\d{2}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

function validDay(v: string | undefined): v is string {
  return !!v && DAY.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v
}

const label = (iso: string) => formatVietnameseDate(new Date(`${iso}T12:00:00+07:00`))

export default async function Page({ searchParams }: { searchParams: Promise<{ ngay?: string; thang?: string }> }) {
  const user = await requireTeacher()
  const sp = await searchParams
  const today = todayInVietnam()
  const date = validDay(sp.ngay) ? sp.ngay : today
  const month = sp.thang && MONTH.test(sp.thang) ? sp.thang : date.slice(0, 7)

  const [students, initial, recent, monthData] = await Promise.all([
    getStudentsWithStars(user.classId),
    getDay(user.classId, date),
    getRecentDays(user.classId, 5),
    getMonth(user.classId, month),
  ])

  return (
    <>
      <Header title="Điểm danh phi hành đoàn" subtitle="Ghi nhận chuyên cần mỗi ngày" />
      <AttendanceClient
        key={date}
        date={date}
        today={today}
        month={month}
        dateLabel={label(date)}
        isToday={date === today}
        students={students.map((s) => ({ id: s.id, code: s.code, fullName: s.fullName, avatar: s.avatar }))}
        initial={initial}
        history={recent.map((r) => ({ ...r, label: label(r.date).replace(/\/\d{4}$/, '') }))}
        calendarDays={monthData.days}
      />
    </>
  )
}
