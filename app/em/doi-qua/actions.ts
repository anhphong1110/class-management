'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireStudent } from '@/lib/auth/session'
import { signAvatarPaths } from '@/lib/avatars/resolve'
import { rarityTier } from '@/lib/blind-bag/odds'
import { getRewardPreset } from '@/lib/rewards/presets'
import { createServerSupabase } from '@/lib/supabase/server'
import type { RevealGift } from '@/components/blind-bag/types'
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

/**
 * Mở túi mù: máy chủ bốc quà rồi trả về để màn xé túi trình diễn.
 * Cố ý không revalidatePath ở đây, kẻo danh sách yêu cầu lộ kết quả trước khi em xé xong; màn xé túi tự làm mới khi đóng.
 */
export async function openBlindBag(): Promise<{ error: string; gift?: undefined; approved?: undefined } | { gift: RevealGift; approved: boolean; price: number; error?: undefined }> {
  await requireStudent()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('open_blind_bag')
  if (error) return { error: toVietnameseMessage(error.message) }
  const row = (data as { request_id: string; picked_reward_id: string; auto_approved: boolean }[] | null)?.[0]
  if (!row) return { error: toVietnameseMessage('blind_bag_unavailable') }

  const [pickedRes, poolRes, reqRes] = await Promise.all([
    supabase.from('rewards').select('name, cost, icon, image_path').eq('id', row.picked_reward_id).maybeSingle(),
    supabase.from('rewards').select('cost').eq('in_blind_bag', true).eq('hidden', false),
    supabase.from('reward_requests').select('cost').eq('id', row.request_id).maybeSingle(),
  ])
  const picked = pickedRes.data
  if (!picked) return { error: toVietnameseMessage('reward_not_found') }
  const costs = (poolRes.data ?? []).map((r) => r.cost)
  const urls = picked.image_path ? await signAvatarPaths(supabase, [picked.image_path]) : new Map<string, string>()
  const url = picked.image_path ? urls.get(picked.image_path) : undefined
  return {
    gift: {
      name: picked.name,
      visual: url ? { kind: 'image', url } : { kind: 'preset', key: getRewardPreset(picked.icon)?.key ?? 'gift' },
      tier: rarityTier(picked.cost, costs.length ? costs : [picked.cost]),
    },
    approved: row.auto_approved,
    price: reqRes.data?.cost ?? 0,
  }
}
