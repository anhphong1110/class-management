'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireStudent } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'

const rewardInput = z.guid()

export async function requestReward(rewardId: string): Promise<{ error?: string }> {
  await requireStudent()
  const parsed = rewardInput.safeParse(rewardId)
  if (!parsed.success) return { error: toVietnameseMessage('invalid_input') }
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('request_reward', { p_reward_id: parsed.data })
  // Lỗi (out_of_stock, ...) vẫn làm mới trang để số quà còn lại đúng.
  revalidatePath('/em/doi-qua')
  if (error) return { error: toVietnameseMessage(error.message) }
  return {}
}
