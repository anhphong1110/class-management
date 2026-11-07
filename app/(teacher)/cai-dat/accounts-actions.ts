'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { usernameToEmail } from '@/lib/auth/username'
import { generateInternalPassword, validateNewPassword } from '@/lib/accounts/password'
import { pickUsername } from '@/lib/accounts/username'
import { toVietnameseMessage } from '@/lib/errors'

export type CreatedAccount = { studentId: string; name: string; username: string }
export type CreateAccountsResult = { created: CreatedAccount[]; failed: { name: string; reason: string }[] }
export type SetPasswordsResult = { updated: number; failed: string[] } | { error: string }

const guid = z.guid()
const guidList = z.array(z.guid()).min(1).max(200)
// GoTrue chặn đăng nhập của tài khoản bị khóa bằng ban_duration; 876000h ≈ 100 năm.
const BAN_FOREVER = '876000h'

/** Tạo tài khoản với mật khẩu nội bộ không ai biết; cô đặt mật khẩu cho các em ở bước sau (`setStudentPasswords`). */
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
    const password = generateInternalPassword()

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
    result.created.push({ studentId: s.id, name: s.full_name, username })
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
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, login_disabled')
    .eq('class_id', classId)
    .eq('role', 'student')
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Cô đặt cùng một mật khẩu cho nhiều em (các em tự đổi lại sau). Mật khẩu không được trả lại hay ghi log;
 * nhật ký chỉ ghi số lượng. Chỉ đụng tới học sinh của lớp cô.
 */
export async function setStudentPasswords(studentIds: string[], password: string): Promise<SetPasswordsResult> {
  const user = await requireTeacher()
  const ids = guidList.safeParse(studentIds)
  if (!ids.success || typeof password !== 'string') return { error: toVietnameseMessage('invalid_input') }
  const invalid = validateNewPassword(password)
  if (invalid) return { error: toVietnameseMessage(invalid) }

  const supabase = await createServerSupabase()
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('class_id', user.classId)
    .eq('role', 'student')
    .in('student_id', [...new Set(ids.data)])
  if (error) throw new Error(error.message)
  if (!profiles || profiles.length === 0) return { error: toVietnameseMessage('account_not_found') }

  const admin = createAdminSupabase()
  let updated = 0
  const failed: string[] = []
  for (const p of profiles) {
    const { error: updateError } = await admin.auth.admin.updateUserById(p.id, { password })
    if (updateError) failed.push(p.display_name)
    else updated++
  }

  const { error: auditError } = await admin.from('audit_logs').insert({
    class_id: user.classId,
    actor_id: user.userId,
    action: 'account_passwords_set',
    entity: 'profiles',
    payload: { count: updated, failed: failed.length },
  })
  if (auditError) console.error('audit_logs account_passwords_set:', auditError.message)
  return { updated, failed }
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
