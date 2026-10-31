import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { getCriteria, getGroups, getRecentBatches, getStarSteps, getStudentsWithStars } from '@/lib/stars/queries'
import { StarsClient } from './StarsClient'

export default async function Page() {
  const user = await requireTeacher()
  const [students, groups, criteria, steps, batches] = await Promise.all([
    getStudentsWithStars(user.classId),
    getGroups(user.classId),
    getCriteria(user.classId),
    getStarSteps(user.classId),
    getRecentBatches(user.classId, 6),
  ])
  return (
    <>
      <Header title="Trạm thi đua" subtitle="Cộng, trừ sao và ghi lý do cho phi hành đoàn" />
      <StarsClient
        students={students}
        groups={groups}
        criteria={criteria}
        steps={steps}
        batches={batches}
        nowIso={new Date().toISOString()}
      />
    </>
  )
}
