import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { getAccountRows } from '@/lib/accounts/queries'
import { getSettingsData } from '@/lib/settings/queries'
import { AccountsSection } from './AccountsSection'
import { SettingsClient } from './SettingsClient'

export default async function Page() {
  const user = await requireTeacher()
  const [data, accounts] = await Promise.all([getSettingsData(user.classId), getAccountRows(user.classId)])
  return (
    <>
      <Header title="Cài đặt" subtitle="Thiết lập lớp học, quyền học sinh và dữ liệu" />
      <SettingsClient {...data} />
      <AccountsSection accounts={accounts} />
      {/* Tasks 6-7: mục "Năm học và dữ liệu" đặt ở đây. */}
    </>
  )
}
