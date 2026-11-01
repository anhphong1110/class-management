'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireStudent } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'

const rewardInput = z.guid()

export async function requestReward(rewardId: string): Promise<{ error?: string; approved?: boolean }> {
  await requireStudent()
  const parsed = rewardInput.safeParse(rewardId)
  if (!parsed.success) return { error: toVietnameseMessage('invalid_input_student') }
  const supabase = await createServerSupabase()
  const { data: requestId, error } = await supabase.rpc('request_reward', { p_reward_id: parsed.data })
  // Lỗi (out_of_stock, ...) vẫn làm mới trang để số quà còn lại đúng.
  revalidatePath('/em/doi-qua')
  if (error) return { error: toVietnameseMessage(error.message) }
  // Trạng thái thật do RPC quyết định (tự duyệt khi cô tắt require_approval), không đoán từ cờ.
  let approved = false
  if (requestId) {
    const { data: row } = await supabase.from('reward_requests').select('status').eq('id', requestId).maybeSingle()
    approved = !!row && row.status !== 'pending'
  }
  return { approved }
}
