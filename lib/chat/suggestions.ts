import type { Role } from '@/lib/domain/types'

export const CHAT_GREETING = 'Mình là Bông, bạn đồng hành học tập của lớp chúng mình. Mình có thể giúp bạn gì nào?'
export const CHAT_LOGIN_HINT = 'Bạn đăng nhập trước để hỏi về lịch học và sao nhé.'
export const CHAT_UNKNOWN = 'Mình chưa hiểu câu này. Bạn thử hỏi về thời khóa biểu hoặc số sao nhé.'

/** Cờ lớp mà học sinh bị giới hạn; giáo viên luôn có đủ. */
export type ChatFlags = { timetable: boolean; rank: boolean }

/** Các nút gợi ý nhanh theo vai trò và quyền xem. Chưa đăng nhập thì không có. */
export function suggestionsFor(role: Role | null, flags: ChatFlags): string[] {
  if (!role) return []
  const out: string[] = []
  if (flags.timetable) out.push('Hôm nay học gì?', 'Ngày mai học gì?')
  if (flags.rank) out.push('Ai cao sao nhất?')
  if (role === 'student') out.push('Mình có bao nhiêu sao?')
  return out
}
