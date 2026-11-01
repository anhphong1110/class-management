/** Ngày đang xem của một địa chỉ trang điểm danh: thiếu `?ngay` nghĩa là hôm nay. */
function viewedDay(url: URL, today: string): string {
  return url.searchParams.get('ngay') ?? today
}

/**
 * Có cần hỏi "chưa lưu" khi bấm liên kết không.
 * Cùng trang và cùng ngày (chỉ đổi `?thang` của lịch) thì giữ nguyên màn hình nên không hỏi.
 * Bấm kèm Ctrl/Cmd/Shift hoặc chuột giữa mở thẻ mới, trang này vẫn còn nên không hỏi.
 */
export function shouldConfirmLeave(
  to: URL,
  current: URL,
  today: string,
  click: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; button?: number } = {},
): boolean {
  if (click.ctrlKey || click.metaKey || click.shiftKey || (click.button ?? 0) !== 0) return false
  if (to.pathname === current.pathname && viewedDay(to, today) === viewedDay(current, today)) return false
  return true
}
