type Options = { max: number; windowMs: number; now?: () => number }

/**
 * Giới hạn số lần hỏi theo từng người, giữ trong bộ nhớ của tiến trình.
 * Trên serverless mỗi instance đếm riêng nên chỉ là lớp chặn tạm; hạn mức thật nằm ở nhà cung cấp model
 * (hết hạn mức thì bot tự quay về luật).
 */
export function createRateLimiter({ max, windowMs, now = Date.now }: Options) {
  const hits = new Map<string, number[]>()
  return {
    /** true nếu còn lượt (và ghi nhận lượt này), false nếu đã hết. */
    take(key: string): boolean {
      const t = now()
      const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs)
      if (recent.length >= max) {
        hits.set(key, recent)
        return false
      }
      recent.push(t)
      hits.set(key, recent)
      return true
    },
  }
}
