import { requireTeacher } from '@/lib/auth/session'
import { getClassHeaderInfo } from '@/lib/classes/queries'
import { getGroups } from '@/lib/stars/queries'
import { getStudentCards } from '@/lib/students/queries'
import { Header } from '@/components/layout/Header'
import { StudentsClient } from './StudentsClient'

export default async function Page() {
  const user = await requireTeacher()
  const [info, students, groups] = await Promise.all([
    getClassHeaderInfo(user.classId),
    getStudentCards(user.classId),
    getGroups(user.classId),
  ])
  return (
    <>
      <Header title="Quản lý học sinh" subtitle={`Danh sách phi hành đoàn lớp ${info.short}`} />
      <StudentsClient students={students} groups={groups} />
    </>
  )
}
