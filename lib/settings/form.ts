export type InfoValues = {
  school_name: string
  class_name: string
  school_year: string
  teacher_name: string
  slogan: string
  term1_start: string
  term1_end: string
  term2_start: string
  term2_end: string
}

const DATE_KEYS = ['term1_start', 'term1_end', 'term2_start', 'term2_end'] as const

/** Số nguyên dương từ ô nhập; không hợp lệ thì null. Giới hạn 1–50 do máy chủ kiểm. */
export function parseStepInput(raw: string): number | null {
  const t = raw.trim()
  if (!/^[0-9]+$/.test(t)) return null
  const n = Number(t)
  return n >= 1 ? n : null
}

export function addStep(steps: number[], n: number): number[] {
  return steps.includes(n) ? steps : [...steps, n].sort((a, b) => a - b)
}

export function removeStep(steps: number[], n: number): number[] {
  return steps.filter((s) => s !== n)
}

/** Ô ngày để trống nghĩa là chưa đặt ngày. */
export function infoPayload(v: InfoValues): Record<string, string | null> {
  const out: Record<string, string | null> = { ...v }
  for (const k of DATE_KEYS) out[k] = v[k] === '' ? null : v[k]
  return out
}
