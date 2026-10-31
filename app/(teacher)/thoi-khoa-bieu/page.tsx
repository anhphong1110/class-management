import { requireTeacher } from '@/lib/auth/session'
import { getClassHeaderInfo } from '@/lib/classes/queries'
import { Header } from '@/components/layout/Header'
import { ComingSoon } from '@/components/layout/ComingSoon'

export default async function Page() {
  const user = await requireTeacher()
  const info = await getClassHeaderInfo(user.classId)
  return (
    <>
      <Header title="Lịch bay của phi hành gia" subtitle={`Thời khóa biểu lớp ${info.short}${info.term ? ` · Học kỳ ${info.term}` : ''}`} />
      <ComingSoon title="Thời khóa biểu" />
    </>
  )
}
