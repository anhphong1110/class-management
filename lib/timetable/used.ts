/** Số tiết đang dùng của từng môn. Tiết thứ Bảy (khóa bắt đầu bằng `6-`) không tính khi thứ Bảy tắt. */
export function countUsed(slots: { weekday: number; subject_id: string | null }[], saturday: boolean): Map<string, number> {
  const used = new Map<string, number>()
  for (const s of slots) {
    if (!s.subject_id || (s.weekday === 6 && !saturday)) continue
    used.set(s.subject_id, (used.get(s.subject_id) ?? 0) + 1)
  }
  return used
}
