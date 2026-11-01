'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionDenial, getSessionUser } from '@/lib/auth/session'
import { safeNext } from '@/lib/auth/safe-next'
import { normalizeUsername, usernameToEmail } from '@/lib/auth/username'
import { signInErrorKey } from '@/lib/auth/sign-in-error'
import { toVietnameseMessage } from '@/lib/errors'

export type SignInState = { error?: string }

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const parsed = normalizeUsername(String(form.get('username') ?? ''))
  if (!parsed.ok) return { error: toVietnameseMessage(parsed.error) }

  const password = String(form.get('password') ?? '')
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(parsed.username),
    password,
  })
  if (error) return { error: toVietnameseMessage(signInErrorKey(error)) }

  const user = await getSessionUser()
  if (!user) {
    const reason = await getSessionDenial()
    await supabase.auth.signOut()
    return { error: toVietnameseMessage(reason) }
  }

  const next = safeNext(form.get('next'))
  redirect(next ?? (user.role === 'teacher' ? '/tong-quan' : '/em'))
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/dang-nhap')
}
