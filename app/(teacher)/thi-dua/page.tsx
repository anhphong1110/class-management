import { z } from 'zod'
import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { getCriteria, getGroups, getRecentBatches, getStarSteps, getStudentsWithStars } from '@/lib/stars/queries'
import { StarsClient } from './StarsClient'

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string | string[] }> }) {
  const user = await requireTeacher()
  const [students, groups, criteria, steps, batches] = await Promise.all([
    getStudentsWithStars(user.classId),
    getGroups(user.classId),
    getCriteria(user.classId),
    getStarSteps(user.classId),
    getRecentBatches(user.classId, 6),
  ])
  const { to } = await searchParams
  const toId = typeof to === 'string' && z.guid().safeParse(to).success ? to : null
  const initialSelectedIds = toId ? (groups.find((g) => g.id === toId)?.memberIds ?? []) : []
  const activeIds = new Set(students.map((s) => s.id))
  return (
    <>
      <Header title="Trạm năng lượng ngôi sao" subtitle="Cộng, trừ sao và ghi lý do cho phi hành đoàn" />
      <StarsClient
        key={toId ?? "none"}
        students={students}
        groups={groups}
        criteria={criteria}
        steps={steps}
        batches={batches}
        initialSelectedIds={initialSelectedIds.filter((id) => activeIds.has(id))}
        nowIso={new Date().toISOString()}
      />
    </>
  )
}
