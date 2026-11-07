'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionDenial, getSessionUser } from '@/lib/auth/session'
import { safeNext } from '@/lib/auth/safe-next'
import { normalizeUsername, usernameToEmail } from '@/lib/auth/username'
import { signInErrorKey } from '@/lib/auth/sign-in-error'
import { toVietnameseMessage } from '@/lib/errors'
import { demoAccount } from '@/lib/auth/demo'
import type { Role } from '@/lib/domain/types'

export type SignInState = { error?: string }

async function signInWith(
  rawUsername: string,
  password: string,
  rawNext: FormDataEntryValue | null,
  expectedRole?: Role,
): Promise<SignInState> {
  const parsed = normalizeUsername(rawUsername)
  if (!parsed.ok) return { error: toVietnameseMessage(parsed.error) }

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
  if (expectedRole && user.role !== expectedRole) {
    await supabase.auth.signOut()
    return { error: 'Tài khoản vào nhanh chưa được cấu hình đúng. Hãy đăng nhập bằng tên và mật khẩu.' }
  }

  const next = safeNext(rawNext)
  redirect(next ?? (user.role === 'teacher' ? '/tong-quan' : '/em'))
}

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  return signInWith(String(form.get('username') ?? ''), String(form.get('password') ?? ''), form.get('next'))
}

/** Chế độ chấm thi: vào một chạm bằng tài khoản cấu hình sẵn ở server (xem lib/auth/demo.ts). */
export async function demoSignIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const role = form.get('role')
  if (role !== 'teacher' && role !== 'student') return { error: 'Chế độ vào nhanh đang tắt.' }
  const account = demoAccount(role)
  if (!account) return { error: 'Chế độ vào nhanh đang tắt.' }
  return signInWith(account.username, account.password, form.get('next'), role)
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/dang-nhap')
}
