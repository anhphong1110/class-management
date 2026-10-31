import { STAT } from '@/lib/rewards/status'

/** Nhãn trạng thái yêu cầu cho học sinh: như của giáo viên, riêng pending theo Student.dc.html. */
export const STUDENT_STAT = { ...STAT, pending: ['Chờ cô duyệt', STAT.pending[1], STAT.pending[2]] as [string, string, string] }

export function giftButton(gift: { left: number; cost: number }, available: number): { label: string; disabled: boolean } {
  if (gift.left <= 0) return { label: 'Hết quà', disabled: true }
  if (available < gift.cost) return { label: `Chưa đủ sao (thiếu ${gift.cost - available})`, disabled: true }
  return { label: 'Đổi quà', disabled: false }
}

export function requestSuccessMessage(name: string, cost: number, reserve: boolean): string {
  return reserve
    ? `Đã gửi yêu cầu đổi "${name}". Hệ thống giữ ${cost} sao cho em, chờ cô duyệt.`
    : `Đã gửi yêu cầu đổi "${name}", chờ cô duyệt.`
}
