import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { getAccountRows } from '@/lib/accounts/queries'
import { getSettingsData } from '@/lib/settings/queries'
import { getArchivedClasses, getDemoStudentCount } from '@/lib/backup/queries'
import { AccountsSection } from './AccountsSection'
import { DataSection } from './DataSection'
import { SettingsClient } from './SettingsClient'

export default async function Page() {
  const user = await requireTeacher()
  const [data, accounts, archived, demoCount] = await Promise.all([
    getSettingsData(user.classId),
    getAccountRows(user.classId),
    getArchivedClasses(),
    getDemoStudentCount(user.classId),
  ])
  return (
    <>
      <Header title="Cài đặt" subtitle="Thiết lập lớp học, quyền học sinh và dữ liệu" />
      <SettingsClient {...data} />
      <AccountsSection accounts={accounts} />
      <DataSection
        archived={archived}
        classId={user.classId}
        demoCount={demoCount}
        current={{ schoolYear: data.cls.school_year, className: data.cls.class_name, teacherName: data.cls.teacher_name }}
      />
    </>
  )
}
