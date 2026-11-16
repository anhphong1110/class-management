import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * Dữ liệu cho khối "Việc hôm nay". Giá trị là `null` khi không đọc được,
 * để trang bỏ qua mục đó thay vì hiển thị số liệu sai.
 */
export type TodayTasks = {
  /** Số yêu cầu đổi quà đang chờ duyệt. */
  pendingGifts: number | null
}

export async function getTodayTasks(classId: string): Promise<TodayTasks> {
  try {
    const supabase = await createServerSupabase()
    const { count, error } = await supabase
      .from('reward_requests')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('status', 'pending')
    if (error) throw new Error(error.message)
    return { pendingGifts: count ?? 0 }
  } catch {
    return { pendingGifts: null }
  }
}
