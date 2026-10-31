'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/session'
import { normalizeUsername, usernameToEmail } from '@/lib/auth/username'
import { toVietnameseMessage } from '@/lib/errors'

export type SignInState = { error?: string }

function safeNext(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return null
  // Ký tự điều khiển (tab/CR/LF bị trình duyệt bỏ qua) và dấu gạch ngược có thể biến `/\t/x` thành `//x`.
  if (/[\x00-\x1F\x7F\\]/.test(raw)) return null
  try {
    const base = 'http://local.invalid'
    const u = new URL(raw, base)
    if (u.origin !== base) return null
    return u.pathname + u.search + u.hash
  } catch {
    return null
  }
}

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const parsed = normalizeUsername(String(form.get('username') ?? ''))
  if (!parsed.ok) return { error: toVietnameseMessage(parsed.error) }

  const password = String(form.get('password') ?? '')
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(parsed.username),
    password,
  })
  if (error) return { error: toVietnameseMessage('invalid_credentials') }

  const user = await getSessionUser()
  if (!user) {
    await supabase.auth.signOut()
    return { error: toVietnameseMessage('no_profile') }
  }

  const next = safeNext(form.get('next'))
  redirect(next ?? (user.role === 'teacher' ? '/tong-quan' : '/em'))
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/dang-nhap')
}
