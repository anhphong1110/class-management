/** Ảnh gốc chọn từ máy: tối đa 5 MB, rồi nén ở trình duyệt. */
export const MAX_IMAGE_BYTES = 5242880
/** Server Action chỉ nhận body tới 2 MB: ảnh sau khi nén phải nằm trong giới hạn này. */
export const MAX_UPLOAD_BYTES = 2097152
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export type ImageCheck = { ok: true } | { ok: false; error: 'file_too_large' | 'unsupported_type' }

export function validateImageFile(file: { size: number; type: string }, maxBytes = MAX_IMAGE_BYTES): ImageCheck {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return { ok: false, error: 'unsupported_type' }
  if (file.size > maxBytes) return { ok: false, error: 'file_too_large' }
  return { ok: true }
}
