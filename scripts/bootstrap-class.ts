// Tạo lớp đầu tiên cho môi trường thật: classes (+ class_settings do trigger), 12 avatar preset, tài khoản
// giáo viên và owner_id. Đọc mọi giá trị từ biến môi trường; không bao giờ in TEACHER_PASSWORD.
import { createClient } from '@supabase/supabase-js'
import { usernameToEmail } from '../lib/auth/username'
import { buildAvatarRows, buildClassRow, parseBootstrapEnv } from './lib/bootstrap'

async function main() {
  const parsed = parseBootstrapEnv(process.env)
  if (!parsed.ok) {
    console.error(parsed.error)
    process.exit(1)
  }
  const cfg = parsed.value
  const supabase = createClient(cfg.supabaseUrl, cfg.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: dup, error: dupErr } = await supabase
    .from('classes').select('id')
    .eq('class_name', cfg.className).eq('school_year', cfg.schoolYear).limit(1)
  if (dupErr) throw dupErr
  if (dup && dup.length > 0) {
    console.error(`Đã có lớp "${cfg.className}" năm học "${cfg.schoolYear}". Dừng, không tạo thêm.`)
    process.exit(2)
  }

  const { data: prof, error: profSelErr } = await supabase
    .from('profiles').select('id').eq('username', cfg.teacherUsername).maybeSingle()
  if (profSelErr) throw profSelErr
  if (prof) {
    console.error(`Tên đăng nhập ${cfg.teacherUsername} đã tồn tại. Dừng, không tạo thêm.`)
    process.exit(2)
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: usernameToEmail(cfg.teacherUsername),
    password: cfg.teacherPassword,
    email_confirm: true,
  })
  if (createErr) throw new Error(`Không tạo được tài khoản Auth: ${createErr.message}`)
  const userId = created.user.id
  let classId: string | null = null

  try {
    const { data: cls, error: clsErr } = await supabase
      .from('classes').insert(buildClassRow(cfg, userId)).select('id').single()
    if (clsErr) throw clsErr
    classId = cls.id

    const { error: avErr } = await supabase.from('avatar_library').insert(buildAvatarRows(cls.id))
    if (avErr) throw avErr

    const { error: pErr } = await supabase.from('profiles').insert({
      id: userId,
      class_id: cls.id,
      role: 'teacher',
      username: cfg.teacherUsername,
      display_name: cfg.teacherName,
    })
    if (pErr) throw pErr
  } catch (e) {
    // Hoàn tác để chạy lại được.
    if (classId) {
      await supabase.from('avatar_library').delete().eq('class_id', classId)
      await supabase.from('class_settings').delete().eq('class_id', classId)
      await supabase.from('classes').delete().eq('id', classId)
    }
    await supabase.auth.admin.deleteUser(userId)
    throw e
  }

  console.log(`Đã tạo lớp "${cfg.className}" (${cfg.schoolYear}), 12 avatar preset và giáo viên ${cfg.teacherUsername}.`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : 'Lỗi không rõ')
  process.exit(1)
})
