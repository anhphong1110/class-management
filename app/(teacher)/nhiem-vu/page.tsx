import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { getMissionsData } from '@/lib/missions/queries'
import { getStudentsWithStars } from '@/lib/stars/queries'
import { MissionsClient } from './MissionsClient'

export default async function Page() {
  const user = await requireTeacher()
  const [data, students] = await Promise.all([getMissionsData(user.classId), getStudentsWithStars(user.classId)])
  return (
    <>
      <Header title="Nhiệm vụ phi hành gia" subtitle="Nhiệm vụ và huy hiệu cho cả lớp" />
      <MissionsClient
        data={data}
        students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
      />
    </>
  )
}
