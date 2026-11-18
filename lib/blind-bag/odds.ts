/**
 * Toán của túi mù, khớp với public.open_blind_bag / blind_bag_info trong SQL:
 * giá túi = trung bình cộng cost (làm tròn, tối thiểu 1); xác suất của món i tỉ lệ với 1/cost.
 */

/** Bậc hiếm 0..4 (thường → hiếm nhất), dùng để chọn màu pháo hoa và viền thẻ. */
export const RARITY_COLORS = ['#9ea3b2', '#34d399', '#4285f5', '#995aeb', '#ffb81e'] as const

export function bagPrice(costs: readonly number[]): number {
  if (costs.length === 0) return 0
  const avg = costs.reduce((a, b) => a + b, 0) / costs.length
  return Math.max(Math.round(avg), 1)
}

/** Xác suất (0..1) của từng món, cùng thứ tự với `costs`. */
export function oddsOf(costs: readonly number[]): number[] {
  const w = costs.map((c) => 1 / c)
  const total = w.reduce((a, b) => a + b, 0)
  return w.map((x) => x / total)
}

/** Bậc hiếm của một món theo thứ hạng cost trong túi: món rẻ nhất = 0, món đắt nhất = 4. */
export function rarityTier(cost: number, costs: readonly number[]): number {
  const distinct = [...new Set(costs)].sort((a, b) => a - b)
  if (distinct.length <= 1) return 0
  const idx = distinct.indexOf(cost)
  if (idx < 0) return 0
  return Math.round((idx / (distinct.length - 1)) * 4)
}
