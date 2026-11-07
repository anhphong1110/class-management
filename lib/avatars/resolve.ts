import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import type { AvatarValue } from '@/components/avatar/AvatarImage'
import type { AvatarPreset } from '@/components/avatar/presets'

export type { AvatarValue }

const SIGNED_URL_TTL = 3600
// Dùng lại URL đã ký trong 50 phút để token không đổi giữa các trang (đổi token thì trình duyệt tải lại ảnh).
const REUSE_MS = 50 * 60 * 1000
const signedCache = new Map<string, { url: string; at: number }>()

type SupabaseServer = Awaited<ReturnType<typeof createServerSupabase>>
type AvatarRow = { kind: string; preset: unknown; image_path: string | null }

/** One createSignedUrls call for all upload paths; returns path -> signed URL. */
export async function signAvatarPaths(
  supabase: SupabaseServer,
  paths: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  const now = Date.now()
  const unique: string[] = []
  for (const p of new Set(paths)) {
    const hit = signedCache.get(p)
    if (hit && now - hit.at < REUSE_MS) urls.set(p, hit.url)
    else unique.push(p)
  }
  if (!unique.length) return urls
  const { data, error } = await supabase.storage.from('class-media').createSignedUrls(unique, SIGNED_URL_TTL)
  // Ảnh lỗi thì vẫn trả avatar mặc định, nhưng phải để lại dấu vết để biết vì sao.
  if (error) console.error('signAvatarPaths: createSignedUrls failed', error.message)
  for (const s of data ?? []) {
    if (!s.path || !s.signedUrl) continue
    urls.set(s.path, s.signedUrl)
    signedCache.set(s.path, { url: s.signedUrl, at: now })
  }
  return urls
}

export function toAvatarValue(row: AvatarRow, urls: Map<string, string>): AvatarValue {
  if (row.kind === 'upload') {
    const url = row.image_path ? urls.get(row.image_path) : undefined
    return url ? { kind: 'upload', url } : null
  }
  return row.preset ? { kind: 'preset', preset: (row.preset as AvatarPreset) } : null
}

export async function resolveAvatars(ids: (string | null)[]): Promise<Map<string, AvatarValue>> {
  const result = new Map<string, AvatarValue>()
  const unique = [...new Set(ids.filter((i): i is string => !!i))]
  if (!unique.length) return result
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('avatar_library')
    .select('id, kind, preset, image_path')
    .in('id', unique)
  const rows = data ?? []
  const urls = await signAvatarPaths(
    supabase,
    rows.filter((r) => r.kind === 'upload' && r.image_path).map((r) => r.image_path as string),
  )
  for (const r of rows) result.set(r.id, toAvatarValue(r, urls))
  return result
}

export async function resolveAvatar(avatarId: string | null): Promise<AvatarValue> {
  if (!avatarId) return null
  return (await resolveAvatars([avatarId])).get(avatarId) ?? null
}

/** Chỉ cho test: xóa bộ nhớ đệm URL đã ký. */
export function clearSignedAvatarCache() {
  signedCache.clear()
}
