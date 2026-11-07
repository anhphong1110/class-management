import 'server-only'
import { getDay } from '@/lib/attendance/queries'
import { todayInVietnam } from '@/lib/domain/date'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * Dữ liệu cho khối "Việc hôm nay". Mỗi giá trị là `null` khi không đọc được,
 * để trang bỏ qua mục đó thay vì hiển thị số liệu sai.
 */
export type TodayTasks = {
  /** Hôm nay đã có ít nhất một dòng điểm danh chưa. */
  attendanceTaken: boolean | null
  /** Số yêu cầu đổi quà đang chờ duyệt. */
  pendingGifts: number | null
}

export async function getTodayTasks(classId: string, now: Date = new Date()): Promise<TodayTasks> {
  const [day, gifts] = await Promise.allSettled([
    getDay(classId, todayInVietnam(now)),
    (async () => {
      const supabase = await createServerSupabase()
      const { count, error } = await supabase
        .from('reward_requests')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('status', 'pending')
      if (error) throw new Error(error.message)
      return count ?? 0
    })(),
  ])
  return {
    attendanceTaken: day.status === 'fulfilled' ? Object.keys(day.value).length > 0 : null,
    pendingGifts: gifts.status === 'fulfilled' ? gifts.value : null,
  }
}
