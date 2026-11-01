import 'server-only'
import { cache } from 'react'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/session'
import { resolveAvatar } from '@/lib/avatars/resolve'

export type ShellClass = {
  school_name: string
  class_name: string
  brand_title: string | null
  school_year: string
  teacher_name: string
  slogan: string
  class_logo_path: string | null
  logo_path: string | null
  theme: 'indigo' | 'pink' | 'mint' | 'gold'
}

export const getShellData = cache(async () => {
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createServerSupabase()
  const { data: cls } = await supabase
    .from('classes')
    .select('school_name, class_name, brand_title, school_year, teacher_name, slogan, class_logo_path, logo_path, theme')
    .eq('id', user.classId)
    .maybeSingle()
  if (!cls) return null
  const sign = async (path: string | null) => {
    if (!path) return null
    const { data: signed } = await supabase.storage.from('class-media').createSignedUrl(path, 3600)
    return signed?.signedUrl ?? null
  }
  const [classLogoUrl, schoolLogoUrl] = await Promise.all([sign(cls.class_logo_path), sign(cls.logo_path)])
  const avatar = await resolveAvatar(user.avatarId)
  return { user, cls: cls as ShellClass, classLogoUrl, schoolLogoUrl, avatar }
})
