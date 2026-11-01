'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { usernameToEmail } from '@/lib/auth/username'
import { generateTempPassword } from '@/lib/accounts/password'
import { pickUsername } from '@/lib/accounts/username'
import { toVietnameseMessage } from '@/lib/errors'

export type TempAccount = { name: string; username: string; password: string }
export type CreateAccountsResult = { created: TempAccount[]; failed: { name: string; reason: string }[] }

const guid = z.guid()
// GoTrue chặn đăng nhập của tài khoản bị khóa bằng ban_duration; 876000h ≈ 100 năm.
const BAN_FOREVER = '876000h'

/** Mật khẩu tạm chỉ trả về trình duyệt một lần, không lưu và không ghi log. */
export async function createStudentAccounts(): Promise<CreateAccountsResult> {
  const user = await requireTeacher()
  const supabase = await createServerSupabase()
  const admin = createAdminSupabase()

  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('class_id', user.classId)
    .is('archived_at', null)
    .order('roll_no', { ascending: true })
  if (error) throw new Error(error.message)

  // Tên đăng nhập là duy nhất trên toàn hệ thống, nên đọc cả các lớp khác.
  const { data: profiles, error: profError } = await admin.from('profiles').select('username, student_id')
  if (profError) throw new Error(profError.message)
  const taken = new Set((profiles ?? []).map((p) => p.username))
  const hasAccount = new Set((profiles ?? []).map((p) => p.student_id).filter(Boolean))

  const result: CreateAccountsResult = { created: [], failed: [] }
  for (const s of students ?? []) {
    if (hasAccount.has(s.id)) continue
    const username = pickUsername(s.full_name, taken)
    taken.add(username)
    const password = generateTempPassword()

    const { data: made, error: authError } = await admin.auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
    })
    if (authError || !made.user) {
      const exists = authError?.code === 'email_exists'
      result.failed.push({ name: s.full_name, reason: toVietnameseMessage(exists ? 'account_exists' : 'account_create_failed') })
      continue
    }

    const { error: insertError } = await admin.from('profiles').insert({
      id: made.user.id,
      class_id: user.classId,
      role: 'student',
      username,
      display_name: s.full_name,
      student_id: s.id,
      avatar_id: null,
    })
    if (insertError) {
      // Không để lại tài khoản Auth mồ côi (không có profiles).
      const { error: rollbackError } = await admin.auth.admin.deleteUser(made.user.id)
      if (rollbackError) console.error('Không xóa được tài khoản Auth mồ côi:', made.user.id, rollbackError.message)
      result.failed.push({
        name: s.full_name,
        reason: toVietnameseMessage(rollbackError ? 'account_rollback_failed' : 'account_profile_failed'),
      })
      continue
    }
    result.created.push({ name: s.full_name, username, password })
  }

  // Chỉ ghi số lượng. Nếu ghi nhật ký lỗi cũng không ném: ném lúc này sẽ làm mất mật khẩu vừa tạo.
  const { error: auditError } = await admin.from('audit_logs').insert({
    class_id: user.classId,
    actor_id: user.userId,
    action: 'accounts_created',
    entity: 'profiles',
    payload: { count: result.created.length, failed: result.failed.length },
  })
  if (auditError) console.error('audit_logs accounts_created:', auditError.message)

  revalidatePath('/cai-dat')
  return result
}

/** Nhật ký chỉ ghi mã học sinh (và cờ bật/tắt), không bao giờ ghi mật khẩu. Lỗi ghi nhật ký không làm hỏng thao tác đã xong. */
async function audit(
  user: { classId: string; userId: string },
  action: string,
  studentId: string,
  extra: Record<string, boolean> = {},
) {
  const { error } = await createAdminSupabase().from('audit_logs').insert({
    class_id: user.classId,
    actor_id: user.userId,
    action,
    entity: 'profiles',
    payload: { student_id: studentId, ...extra },
  })
  if (error) console.error(`audit_logs ${action}:`, error.message)
}

async function findStudentProfile(classId: string, studentId: string) {
  const { data, error } = await createAdminSupabase()
    .from('profiles')
    .select('id, username, display_name, login_disabled')
    .eq('class_id', classId)
    .eq('role', 'student')
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function resetStudentPassword(studentId: string): Promise<TempAccount | { error: string }> {
  const user = await requireTeacher()
  if (!guid.safeParse(studentId).success) return { error: toVietnameseMessage('invalid_input') }
  const profile = await findStudentProfile(user.classId, studentId)
  if (!profile) return { error: toVietnameseMessage('account_not_found') }

  const password = generateTempPassword()
  const { error } = await createAdminSupabase().auth.admin.updateUserById(profile.id, { password })
  if (error) return { error: toVietnameseMessage('account_update_failed') }
  await audit(user, 'account_password_reset', studentId)
  return { name: profile.display_name, username: profile.username, password }
}

export async function setStudentLogin(studentId: string, enabled: boolean): Promise<{ error?: string }> {
  const user = await requireTeacher()
  if (!guid.safeParse(studentId).success || typeof enabled !== 'boolean') return { error: toVietnameseMessage('invalid_input') }
  const profile = await findStudentProfile(user.classId, studentId)
  if (!profile) return { error: toVietnameseMessage('account_not_found') }

  const admin = createAdminSupabase()
  const ban = (on: boolean) => admin.auth.admin.updateUserById(profile.id, { ban_duration: on ? 'none' : BAN_FOREVER })
  const { error } = await ban(enabled)
  if (error) return { error: toVietnameseMessage('account_update_failed') }

  const { error: updateError } = await admin.from('profiles').update({ login_disabled: !enabled }).eq('id', profile.id)
  if (updateError) {
    // Hoàn lại để khóa trong Auth và cột login_disabled không lệch nhau.
    const { error: revertError } = await ban(!enabled)
    if (revertError) {
      console.error('Không hoàn lại được khóa đăng nhập:', profile.id, revertError.message)
      return { error: toVietnameseMessage('account_state_mismatch') }
    }
    return { error: toVietnameseMessage('account_update_failed') }
  }
  await audit(user, 'account_login_set', studentId, { enabled })
  revalidatePath('/cai-dat')
  return {}
}
