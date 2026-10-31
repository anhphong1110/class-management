export const MAX_IMAGE_BYTES = 5242880
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export type ImageCheck = { ok: true } | { ok: false; error: 'file_too_large' | 'unsupported_type' }

export function validateImageFile(file: { size: number; type: string }): ImageCheck {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return { ok: false, error: 'unsupported_type' }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'file_too_large' }
  return { ok: true }
}
