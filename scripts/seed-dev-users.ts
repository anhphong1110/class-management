import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { normalizeUsername, usernameToEmail } from '../lib/auth/username'

const CLASS_ID = '00000000-0000-0000-0000-000000000058'

type DevUser = {
  username: string
  role: 'teacher' | 'student'
  displayName: string
  studentCode?: string
  password: string
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY (.env.local)')

const host = new URL(url).hostname
if (host !== '127.0.0.1' && host !== 'localhost') {
  console.error(`Từ chối chạy: seed:dev chỉ dùng cho Supabase cục bộ (127.0.0.1/localhost), hiện là "${host}".`)
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const { users } = JSON.parse(
  readFileSync(new URL('./dev-users.json', import.meta.url), 'utf8'),
) as { users: DevUser[] }

async function main() {
  for (const u of users) {
    const n = normalizeUsername(u.username)
    if (!n.ok) throw new Error(`Tên đăng nhập không hợp lệ: ${u.username}`)

    const { data: existing, error: selErr } = await supabase
      .from('profiles').select('id').eq('username', n.username).maybeSingle()
    if (selErr) throw selErr
    if (existing) {
      console.log(`bỏ qua ${n.username} (đã có)`)
      continue
    }

    let studentId: string | null = null
    if (u.role === 'student') {
      const { data: st, error } = await supabase
        .from('students').select('id').eq('class_id', CLASS_ID).eq('code', u.studentCode ?? '').single()
      if (error) throw error
      studentId = st.id
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: usernameToEmail(n.username),
      password: u.password,
      email_confirm: true,
    })
    if (createErr) throw createErr

    let avatarId: string | null = null
    if (u.role === 'teacher') {
      const { data: av } = await supabase
        .from('avatar_library').select('id').eq('class_id', CLASS_ID).eq('label', 'Cô giáo').maybeSingle()
      avatarId = av?.id ?? null
    }

    const { error: profErr } = await supabase.from('profiles').insert({
      id: created.user.id,
      class_id: CLASS_ID,
      role: u.role,
      username: n.username,
      display_name: u.displayName,
      student_id: studentId,
      avatar_id: avatarId,
    })
    if (profErr) {
      await supabase.auth.admin.deleteUser(created.user.id)
      throw profErr
    }
    if (u.role === 'teacher') {
      const { error: ownerErr } = await supabase
        .from('classes').update({ owner_id: created.user.id }).eq('id', CLASS_ID).is('owner_id', null)
      if (ownerErr) throw ownerErr
    }
    console.log(`đã tạo ${n.username}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
