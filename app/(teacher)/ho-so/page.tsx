import { Header } from '@/components/layout/Header'
import { signAvatarPaths, toAvatarValue } from '@/lib/avatars/resolve'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { ProfileClient, type LibraryItem, type Person } from './ProfileClient'

export default async function Page() {
  const user = await requireTeacher()
  const supabase = await createServerSupabase()

  const [{ data: lib }, { data: students }, { data: settings }] = await Promise.all([
    supabase
      .from('avatar_library')
      .select('id, kind, preset, image_path, label')
      .eq('class_id', user.classId)
      .eq('hidden', false)
      .order('created_at')
      .order('id'),
    supabase
      .from('students')
      .select('id, full_name, avatar_id')
      .eq('class_id', user.classId)
      .is('archived_at', null)
      .order('roll_no'),
    supabase
      .from('class_settings')
      .select('student_can_change_avatar')
      .eq('class_id', user.classId)
      .maybeSingle(),
  ])

  const rows = lib ?? []
  const urls = await signAvatarPaths(
    supabase,
    rows.filter((r) => r.kind === 'upload' && r.image_path).map((r) => r.image_path as string),
  )
  const library: LibraryItem[] = rows.map((r) => ({
    id: r.id,
    label: r.label,
    avatar: toAvatarValue(r, urls),
  }))

  const people: Person[] = [
    { key: 'teacher', target: { kind: 'teacher' }, name: user.displayName, role: 'Giáo viên – Admin', avatarId: user.avatarId },
    ...(students ?? []).map((s) => ({
      key: s.id,
      target: { kind: 'student' as const, studentId: s.id },
      name: s.full_name,
      role: 'Học sinh',
      avatarId: s.avatar_id,
    })),
  ]

  return (
    <>
      <Header title="Hồ sơ và avatar" subtitle="Chọn avatar cho giáo viên và học sinh từ thư viện của lớp" />
      <ProfileClient
        people={people}
        library={library}
        allowStudents={settings?.student_can_change_avatar ?? true}
      />
    </>
  )
}
