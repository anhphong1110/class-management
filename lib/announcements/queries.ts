import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { signAvatarPaths } from '@/lib/avatars/resolve'
import type { AnnouncementView } from './types'

/** Ghim trước, mới trước. Thông báo đã xóa (archived_at) không bao giờ được trả về. */
export async function getAnnouncements(classId: string, _opts: { includeArchived: false }): Promise<AnnouncementView[]> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('announcements')
    .select('id, type, title, body, pinned, published_at, image_path')
    .eq('class_id', classId)
    .is('archived_at', null)
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = data ?? []
  const urls = await signAvatarPaths(
    supabase,
    rows.map((r) => r.image_path).filter((p): p is string => !!p),
  )
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    pinned: r.pinned,
    publishedAt: r.published_at,
    imageUrl: (r.image_path && urls.get(r.image_path)) || null,
  }))
}
