import 'server-only'
import { cache } from 'react'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/session'
import type { AvatarValue } from '@/components/avatar/AvatarImage'
import type { AvatarPreset } from '@/components/avatar/presets'

export type ShellClass = {
  school_name: string
  class_name: string
  school_year: string
  teacher_name: string
  slogan: string
  class_logo_path: string | null
  theme: 'indigo' | 'pink' | 'mint' | 'gold'
}

export async function resolveAvatar(avatarId: string | null): Promise<AvatarValue> {
  if (!avatarId) return null
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('avatar_library')
    .select('kind, preset, image_path')
    .eq('id', avatarId)
    .maybeSingle()
  if (!data) return null
  if (data.kind === 'upload' && data.image_path) {
    const { data: signed } = await supabase.storage
      .from('class-media')
      .createSignedUrl(data.image_path, 3600)
    return signed?.signedUrl ? { kind: 'upload', url: signed.signedUrl } : null
  }
  return data.preset ? { kind: 'preset', preset: data.preset as AvatarPreset } : null
}

export const getShellData = cache(async () => {
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createServerSupabase()
  const { data: cls } = await supabase
    .from('classes')
    .select('school_name, class_name, school_year, teacher_name, slogan, class_logo_path, theme')
    .eq('id', user.classId)
    .maybeSingle()
  if (!cls) return null
  let classLogoUrl: string | null = null
  if (cls.class_logo_path) {
    const { data: signed } = await supabase.storage
      .from('class-media')
      .createSignedUrl(cls.class_logo_path, 3600)
    classLogoUrl = signed?.signedUrl ?? null
  }
  const avatar = await resolveAvatar(user.avatarId)
  return { user, cls: cls as ShellClass, classLogoUrl, avatar }
})
