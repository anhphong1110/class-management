import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { requireTeacher } from '@/lib/auth/session'
import { getRewardRequests, getRewards } from '@/lib/rewards/queries'
import { createServerSupabase } from '@/lib/supabase/server'
import { RewardsClient } from './RewardsClient'

export default async function Page() {
  const user = await requireTeacher()
  const supabase = await createServerSupabase()
  const [rewards, requests, settingsRes] = await Promise.all([
    getRewards(user.classId, { includeHidden: true }),
    getRewardRequests(user.classId, 50),
    supabase.from('class_settings').select('feature_rewards').eq('class_id', user.classId).maybeSingle(),
  ])
  if (settingsRes.error) throw new Error(settingsRes.error.message)
  // Cờ tắt chỉ ẩn trang quà với học sinh; cô vẫn quản lý quà và yêu cầu được.
  const featureOff = !(settingsRes.data?.feature_rewards ?? true)
  return (
    <>
      <Header title="Trạm đổi quà vũ trụ" subtitle="Cửa hàng quà tặng của phi hành đoàn" />
      {featureOff && (
        <div className="mb-5">
          <Card>
            <p className="m-0 font-bold">Tính năng này đang tắt. Cô bật lại trong Cài đặt.</p>
          </Card>
        </div>
      )}
      <RewardsClient rewards={rewards} requests={requests} now={new Date().toISOString()} />
    </>
  )
}
