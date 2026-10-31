import { Header } from '@/components/layout/Header'
import type { AvatarValue } from '@/components/avatar/AvatarImage'
import type { AvatarPreset } from '@/components/avatar/presets'
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
  const paths = rows.filter((r) => r.kind === 'upload' && r.image_path).map((r) => r.image_path as string)
  const urls = new Map<string, string>()
  if (paths.length) {
    const { data: signed } = await supabase.storage.from('class-media').createSignedUrls(paths, 3600)
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl)
  }
  const library: LibraryItem[] = rows.map((r) => {
    let avatar: AvatarValue = null
    if (r.kind === 'upload') {
      const url = r.image_path ? urls.get(r.image_path) : undefined
      avatar = url ? { kind: 'upload', url } : null
    } else if (r.preset) {
      avatar = { kind: 'preset', preset: r.preset as AvatarPreset }
    }
    return { id: r.id, label: r.label, avatar }
  })

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
