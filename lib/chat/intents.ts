import type { Period } from '@/lib/domain/period'

export type RosterEntry = { id: string; fullName: string }

/** 0 = Chủ Nhật, 1 = Thứ Hai ... 6 = Thứ Bảy (cùng quy ước với timetable_slots.weekday). */
export type TimetableDay = 'today' | 'tomorrow' | number

export type ChatIntent =
  | { intent: 'timetable'; day: TimetableDay }
  | { intent: 'top_stars'; period: Period; limit: number }
  | { intent: 'my_stars' }
  | { intent: 'student_stars'; studentIds: string[] }

export const MAX_TOP = 10
const DEFAULT_TOP = 3

/** Bỏ dấu, chữ thường, chỉ giữ chữ và số, gộp khoảng trắng. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const words = (norm: string) => (norm ? norm.split(' ') : [])

/** Chuỗi `phrase` (đã chuẩn hóa) có xuất hiện nguyên từ trong `norm` không. */
function has(norm: string, phrase: string): boolean {
  return ` ${norm} `.includes(` ${phrase} `)
}

type NamePhrases = { full: string; lastTwo: string; given: string }

function phrasesOf(fullName: string): NamePhrases | null {
  const w = words(normalize(fullName))
  if (w.length === 0) return null
  return { full: w.join(' '), lastTwo: w.slice(-2).join(' '), given: w[w.length - 1] }
}

/**
 * Tìm bạn được nhắc tới: ưu tiên họ tên đầy đủ, rồi hai từ cuối, rồi tên gọi.
 * Dừng ở mức đầu tiên có kết quả để "Minh Anh" không kéo theo mọi bạn tên Anh.
 */
function findStudentIds(norm: string, roster: RosterEntry[]): string[] {
  const entries = roster.flatMap((r) => {
    const p = phrasesOf(r.fullName)
    return p ? [{ id: r.id, p }] : []
  })
  for (const level of ['full', 'lastTwo', 'given'] as const) {
    const ids = entries.filter((e) => has(norm, e.p[level])).map((e) => e.id)
    if (ids.length) return ids
  }
  return []
}

const WEEKDAY_WORDS: Record<string, number> = { hai: 1, '2': 1, ba: 2, '3': 2, tu: 3, '4': 3, nam: 4, '5': 4, sau: 5, '6': 5, bay: 6, '7': 6 }

function detectDay(norm: string): TimetableDay {
  if (has(norm, 'hom nay')) return 'today'
  if (has(norm, 'ngay mai')) return 'tomorrow'
  if (has(norm, 'chu nhat')) return 0
  const m = /\bthu (hai|ba|tu|nam|sau|bay|[2-7])\b/.exec(norm)
  if (m) return WEEKDAY_WORDS[m[1]]
  return 'today'
}

function detectPeriod(norm: string): Period {
  if (has(norm, 'tuan')) return 'week'
  if (has(norm, 'thang')) return 'month'
  if (has(norm, 'hoc ky') || has(norm, 'hk')) return 'term'
  return 'year'
}

function detectLimit(norm: string): number {
  const m = /\btop (\d{1,3})\b/.exec(norm)
  if (!m) return DEFAULT_TOP
  return Math.min(MAX_TOP, Math.max(1, Number(m[1])))
}

const SELF_PRONOUNS = ['minh', 'em', 'toi', 'tui']

/** Hiểu câu hỏi bằng luật, không gọi mạng. Trả null khi không khớp kiểu câu nào. */
export function matchIntent(text: string, roster: RosterEntry[]): ChatIntent | null {
  const norm = normalize(text)
  if (!norm) return null

  const asksTop =
    has(norm, 'xep hang') ||
    has(norm, 'top') ||
    has(norm, 'dan dau') ||
    (has(norm, 'nhat') && has(norm, 'sao'))
  if (asksTop) return { intent: 'top_stars', period: detectPeriod(norm), limit: detectLimit(norm) }

  const asksStars = has(norm, 'sao') && (has(norm, 'bao nhieu') || has(norm, 'may') || has(norm, 'cua') || has(norm, 'co'))
  if (asksStars) {
    const ids = findStudentIds(norm, roster)
    if (ids.length) return { intent: 'student_stars', studentIds: ids }
    if (SELF_PRONOUNS.some((p) => has(norm, p))) return { intent: 'my_stars' }
    return { intent: 'student_stars', studentIds: [] }
  }

  const asksTimetable = ['hoc', 'tiet', 'mon', 'thoi khoa bieu', 'tkb'].some((k) => has(norm, k))
  if (asksTimetable) return { intent: 'timetable', day: detectDay(norm) }

  return null
}

export type MaskResult = { masked: string; refs: Record<string, string[]> }

/**
 * Thay tên học sinh trong câu hỏi bằng {HS1}, {HS2}... trước khi gửi cho model bên ngoài.
 * `refs` ghi lại ký hiệu ứng với những học sinh nào, để đổi ngược khi nhận kết quả.
 */
export function maskNames(text: string, roster: RosterEntry[]): MaskResult {
  const entries = roster.flatMap((r) => {
    const p = phrasesOf(r.fullName)
    return p ? [{ id: r.id, p }] : []
  })
  // Cụm dài trước để "Gia Huy" được che nguyên cụm thay vì chỉ "Huy".
  const phrases = [...new Set(entries.flatMap((e) => [e.p.full, e.p.lastTwo, e.p.given]))].sort(
    (a, b) => words(b).length - words(a).length,
  )
  const idsOf = (phrase: string) =>
    entries.filter((e) => e.p.full === phrase || e.p.lastTwo === phrase || e.p.given === phrase).map((e) => e.id)

  const tokens = [...text.matchAll(/\S+/g)].map((m) => ({ raw: m[0], norm: normalize(m[0]) }))
  const out: string[] = []
  const refs: Record<string, string[]> = {}
  const symbolFor = new Map<string, string>()

  for (let i = 0; i < tokens.length; ) {
    let hit: { phrase: string; len: number } | null = null
    for (const phrase of phrases) {
      const len = words(phrase).length
      if (i + len > tokens.length) continue
      if (tokens.slice(i, i + len).map((t) => t.norm).join(' ') === phrase) {
        hit = { phrase, len }
        break
      }
    }
    if (!hit) {
      out.push(tokens[i].raw)
      i += 1
      continue
    }
    let symbol = symbolFor.get(hit.phrase)
    if (!symbol) {
      symbol = `HS${symbolFor.size + 1}`
      symbolFor.set(hit.phrase, symbol)
      refs[symbol] = idsOf(hit.phrase)
    }
    out.push(`{${symbol}}`)
    i += hit.len
  }
  return { masked: out.join(' '), refs }
}
