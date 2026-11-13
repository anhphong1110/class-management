/** Kho học liệu: web Study with Bông, mặc định mở thẳng Góc học tập Lớp 5. */
export const DEFAULT_LEARNING_HUB_URL = 'https://studywithbong.netlify.app/#/khoi/5'

/**
 * Địa chỉ web nhúng. Đọc từ NEXT_PUBLIC_LEARNING_HUB_URL (viết nguyên biểu thức này để Next thay giá trị lúc build).
 * Chỉ nhận https; rỗng, sai định dạng hay giao thức lạ (javascript:, http:) thì rơi về địa chỉ mặc định.
 */
export function getLearningHubUrl(raw: string | undefined = process.env.NEXT_PUBLIC_LEARNING_HUB_URL): string {
  const value = raw?.trim()
  if (!value) return DEFAULT_LEARNING_HUB_URL
  try {
    return new URL(value).protocol === 'https:' ? value : DEFAULT_LEARNING_HUB_URL
  } catch {
    return DEFAULT_LEARNING_HUB_URL
  }
}
