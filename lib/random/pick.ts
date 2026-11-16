export type PickStudent = { id: string; groupId: string | null }
export type PoolOptions = { scope: 'all' | string }

/** Danh sách id được phép gọi theo phạm vi (cả lớp hoặc một tổ). */
export function buildPool(students: PickStudent[], opts: PoolOptions): string[] {
  return students
    .filter((s) => opts.scope === 'all' || s.groupId === opts.scope)
    .map((s) => s.id)
}

/** Chọn ngẫu nhiên một bạn trong pool; `rand` trả về số trong [0, 1). Hết người thì null. */
export function pickNext(pool: string[], called: string[], noRepeat: boolean, rand: () => number): string | null {
  const skip = new Set(noRepeat ? called : [])
  const left = pool.filter((id) => !skip.has(id))
  if (!left.length) return null
  return left[Math.min(left.length - 1, Math.floor(rand() * left.length))]
}
