'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireStudent } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { validateNewPassword } from '@/lib/accounts/password'

const avatarInput = z.guid()

export async function saveMyAvatar(avatarId: string): Promise<{ error?: string }> {
  await requireStudent()
  const parsed = avatarInput.safeParse(avatarId)
  if (!parsed.success) return { error: toVietnameseMessage('invalid_input_student') }
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('set_my_avatar', { p_avatar_id: parsed.data })
  if (error) return { error: toVietnameseMessage(error.message) }
  revalidatePath('/em', 'layout')
  return {}
}

/** Em tự đổi mật khẩu bằng phiên của mình. Mật khẩu không được ghi log. */
export async function changeMyPassword(password: string, confirm: string): Promise<{ error?: string }> {
  await requireStudent()
  if (typeof password !== 'string' || typeof confirm !== 'string') return { error: toVietnameseMessage('invalid_input_student') }
  if (password !== confirm) return { error: toVietnameseMessage('password_mismatch') }
  const invalid = validateNewPassword(password)
  if (invalid) return { error: toVietnameseMessage(invalid) }
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: toVietnameseMessage(error.code === 'same_password' ? 'password_same' : 'unknown') }
  return {}
}
