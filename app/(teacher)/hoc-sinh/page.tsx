import { requireTeacher } from '@/lib/auth/session'
import { getClassHeaderInfo } from '@/lib/classes/queries'
import { Header } from '@/components/layout/Header'
import { ComingSoon } from '@/components/layout/ComingSoon'

export default async function Page() {
  const user = await requireTeacher()
  const info = await getClassHeaderInfo(user.classId)
  return (
    <>
      <Header title="Quản lý học sinh" subtitle={`Danh sách phi hành đoàn lớp ${info.short}`} />
      <ComingSoon title="Quản lý học sinh" />
    </>
  )
}
