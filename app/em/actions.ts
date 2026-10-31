'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireStudent } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'

const avatarInput = z.guid()

export async function saveMyAvatar(avatarId: string): Promise<{ error?: string }> {
  await requireStudent()
  const parsed = avatarInput.safeParse(avatarId)
  if (!parsed.success) return { error: toVietnameseMessage('invalid_input') }
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('set_my_avatar', { p_avatar_id: parsed.data })
  if (error) return { error: toVietnameseMessage(error.message) }
  revalidatePath('/em', 'layout')
  return {}
}
