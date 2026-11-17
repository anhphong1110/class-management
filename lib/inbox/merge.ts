import type { LocalMessage, MessageView } from './types'

function byTime(a: LocalMessage, b: LocalMessage): number {
  // Tin chưa được máy chủ xác nhận luôn nằm cuối, dù đồng hồ máy khách lệch.
  if (!!a.pending !== !!b.pending) return a.pending ? 1 : -1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Gộp tin mới vào danh sách đang hiện, khớp theo `id` hoặc `clientId` để tin lạc quan, tin trả về từ máy chủ
 * và tin từ Realtime không bao giờ bị lặp. Tin đến từ máy chủ luôn thắng (mất cờ pending), kể cả khi
 * `read_at` vừa đổi. Kết quả xếp theo giờ gửi tăng dần.
 */
export function mergeMessages(current: LocalMessage[], incoming: (MessageView | LocalMessage)[]): LocalMessage[] {
  const out = [...current]
  for (const m of incoming) {
    const i = out.findIndex((x) => x.id === m.id || x.clientId === m.clientId)
    if (i === -1) out.push({ ...m })
    else {
      const prev = out[i]
      // Tin chưa xác nhận (pending) không được đè lên tin đã xác nhận.
      if ('pending' in m && m.pending && !prev.pending) continue
      out[i] = { ...m }
    }
  }
  return out.sort(byTime)
}

/** Đánh dấu một tin lạc quan (theo clientId) là đang gửi hoặc lỗi; không thấy thì giữ nguyên. */
export function setPending(list: LocalMessage[], clientId: string, pending: 'sending' | 'failed'): LocalMessage[] {
  return list.map((m) => (m.clientId === clientId && m.pending ? { ...m, pending } : m))
}
