import { STAT } from '@/lib/rewards/status'

/** Nhãn trạng thái yêu cầu cho học sinh: như của giáo viên, riêng pending theo Student.dc.html. */
export const STUDENT_STAT = { ...STAT, pending: ['Chờ cô duyệt', STAT.pending[1], STAT.pending[2]] as [string, string, string] }

/**
 * `enforceStars` = `only_enough || reserve_on_request`, đúng điều kiện request_reward dùng để báo insufficient_stars.
 * Cả hai cùng tắt thì RPC vẫn nhận yêu cầu nên nút không khóa vì thiếu sao.
 */
export function giftButton(
  gift: { left: number; cost: number },
  available: number,
  enforceStars: boolean,
): { label: string; disabled: boolean } {
  if (gift.left <= 0) return { label: 'Hết quà', disabled: true }
  if (enforceStars && available < gift.cost) return { label: `Chưa đủ sao (thiếu ${gift.cost - available})`, disabled: true }
  return { label: 'Đổi quà', disabled: false }
}

/** `approved` = RPC đã tự duyệt (require_approval tắt), nên không còn "chờ cô duyệt". */
export function requestSuccessMessage(name: string, cost: number, reserve: boolean, approved = false): string {
  if (approved) return `Đổi quà "${name}" thành công. Cô sẽ trao quà cho em nhé.`
  return reserve
    ? `Đã gửi yêu cầu đổi "${name}". Hệ thống giữ ${cost} sao cho em, chờ cô duyệt.`
    : `Đã gửi yêu cầu đổi "${name}", chờ cô duyệt.`
}

/** Dòng giải thích ở đầu trang đổi quà, theo việc cô có duyệt từng yêu cầu hay không. */
export function giftsHeroHint(requireApproval: boolean): string {
  return requireApproval
    ? 'Em gửi yêu cầu, cô giáo duyệt thì sao mới bị trừ chính thức.'
    : 'Em bấm đổi là xong, sao được trừ ngay và cô sẽ trao quà cho em.'
}
