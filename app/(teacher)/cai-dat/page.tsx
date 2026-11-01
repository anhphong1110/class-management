import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { getSettingsData } from '@/lib/settings/queries'
import { SettingsClient } from './SettingsClient'

export default async function Page() {
  const user = await requireTeacher()
  const data = await getSettingsData(user.classId)
  return (
    <>
      <Header title="Cài đặt" subtitle="Thiết lập lớp học, quyền học sinh và dữ liệu" />
      <SettingsClient {...data} />
      {/* Task 4: mục "Tài khoản học sinh" đặt ở đây. */}
      {/* Tasks 6-7: mục "Năm học và dữ liệu" đặt ở đây. */}
    </>
  )
}
