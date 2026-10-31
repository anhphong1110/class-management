import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { getRewardRequests, getRewards } from '@/lib/rewards/queries'
import { RewardsClient } from './RewardsClient'

export default async function Page() {
  const user = await requireTeacher()
  const [rewards, requests] = await Promise.all([
    getRewards(user.classId, { includeHidden: true }),
    getRewardRequests(user.classId, 50),
  ])
  return (
    <>
      <Header title="Trạm đổi quà vũ trụ" subtitle="Cửa hàng quà tặng của phi hành đoàn" />
      <RewardsClient rewards={rewards} requests={requests} now={new Date().toISOString()} />
    </>
  )
}
