type CacheOptions = { ttlMs: number; maxEntries?: number; now?: () => number }

/** Bộ nhớ đệm có hạn dùng, giữ trong tiến trình. Đầy thì bỏ mục cũ nhất. */
export function createTtlCache<T>({ ttlMs, maxEntries = 200, now = Date.now }: CacheOptions) {
  const store = new Map<string, { value: T; expires: number }>()
  return {
    get(key: string): T | undefined {
      const hit = store.get(key)
      if (!hit) return undefined
      if (now() >= hit.expires) {
        store.delete(key)
        return undefined
      }
      return hit.value
    },
    set(key: string, value: T) {
      store.delete(key)
      store.set(key, { value, expires: now() + ttlMs })
      while (store.size > maxEntries) {
        const oldest = store.keys().next().value
        if (oldest === undefined) break
        store.delete(oldest)
      }
    },
  }
}

type BreakerOptions = { cooldownMs: number; now?: () => number }

/** Cầu dao: sau khi `trip()` thì `isOpen()` trả true trong `cooldownMs`, để ngừng gọi dịch vụ đang hết hạn mức. */
export function createBreaker({ cooldownMs, now = Date.now }: BreakerOptions) {
  let until = 0
  return {
    trip() {
      until = now() + cooldownMs
    },
    isOpen(): boolean {
      return now() < until
    },
  }
}
