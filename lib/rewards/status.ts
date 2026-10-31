import type { RewardRequestStatus } from '@/lib/rewards/queries'

/** Nhãn, màu nền và màu chữ của trạng thái yêu cầu đổi quà (dùng chung /doi-qua và hồ sơ học sinh). */
export const STAT: Record<RewardRequestStatus, [string, string, string]> = {
  pending: ['Chờ duyệt', '#FFF1CC', '#7A4E00'],
  approved: ['Đã duyệt, chờ trao', '#E3EEFF', '#1F4C9E'],
  delivered: ['Đã nhận quà', '#DDF6F1', '#0B5A4D'],
  rejected: ['Từ chối', '#FFE3EA', '#8E1B3B'],
}
