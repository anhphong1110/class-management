import { createClient } from '@supabase/supabase-js'
import { normalizeUsername, usernameToEmail } from '../lib/auth/username'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.TEACHER_PASSWORD
const rawUsername = arg('username')
const name = arg('name')

if (!url || !serviceKey) throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY')
if (!rawUsername || !name) throw new Error('Cách dùng: pnpm create-teacher -- --username co.khanh --name "Cô Khanh" (TEACHER_PASSWORD trong môi trường)')
if (!password || password.length < 8) throw new Error('Cần biến môi trường TEACHER_PASSWORD (tối thiểu 8 ký tự)')

const n = normalizeUsername(rawUsername)
if (!n.ok) throw new Error('Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm và gạch dưới (3–32 ký tự).')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  if (!n.ok) return
  const { data: existing, error: selErr } = await supabase
    .from('profiles').select('id').eq('username', n.username).maybeSingle()
  if (selErr) throw selErr
  if (existing) {
    console.log(`bỏ qua ${n.username} (đã có)`)
    return
  }

  const { data: cls, error: clsErr } = await supabase
    .from('classes').select('id').is('archived_at', null).order('created_at').limit(2)
  if (clsErr) throw clsErr
  if (!cls || cls.length === 0) throw new Error('Chưa có lớp đang hoạt động')
  if (cls.length > 1) throw new Error('Có nhiều hơn một lớp đang hoạt động')

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: usernameToEmail(n.username),
    password,
    email_confirm: true,
  })
  if (createErr) throw createErr

  const { error: profErr } = await supabase.from('profiles').insert({
    id: created.user.id,
    class_id: cls[0].id,
    role: 'teacher',
    username: n.username,
    display_name: name,
  })
  if (profErr) {
    await supabase.auth.admin.deleteUser(created.user.id)
    throw profErr
  }
  const { error: ownerErr } = await supabase
    .from('classes').update({ owner_id: created.user.id }).eq('id', cls[0].id).is('owner_id', null)
  if (ownerErr) throw ownerErr
  console.log(`đã tạo giáo viên ${n.username}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
