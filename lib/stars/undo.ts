/**
 * Hoàn tác batch cộng bị chặn vì không đủ sao khả dụng. Có phải do sao đang được giữ cho yêu cầu đổi quà không?
 * Đúng khi bạn đó có sao đang giữ và, nếu nhả số sao đó ra, sẽ đủ để hoàn tác.
 */
export function blockedByReservation(s: { available: number; held: number; needed: number }): boolean {
  return s.held > 0 && s.available < s.needed && s.available + s.held >= s.needed
}

/** Mọi bạn thiếu sao đều thiếu vì sao đang giữ (và có ít nhất một bạn thiếu). */
export function allBlockedByReservation(list: { available: number; held: number; needed: number }[]): boolean {
  return list.length > 0 && list.every(blockedByReservation)
}
