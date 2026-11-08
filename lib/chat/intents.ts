import type { Period } from '@/lib/domain/period'

export type RosterEntry = { id: string; fullName: string }

/** Tên môn và tên quà của lớp (chỉ tên) để nhận ra trong câu hỏi. */
export type Catalog = { subjects: string[]; rewards: string[] }
export const EMPTY_CATALOG: Catalog = { subjects: [], rewards: [] }

/** 0 = Chủ Nhật, 1 = Thứ Hai ... 6 = Thứ Bảy (cùng quy ước với timetable_slots.weekday). */
export type TimetableDay = 'today' | 'tomorrow' | number

export type ChatIntent =
  | { intent: 'timetable'; day: TimetableDay }
  | { intent: 'top_stars'; period: Period; limit: number }
  | { intent: 'my_stars' }
  | { intent: 'student_stars'; studentIds: string[] }
  | { intent: 'class_size' }
  | { intent: 'teacher_name' }
  | { intent: 'class_stars'; period: 'week' | 'month' }
  | { intent: 'rewards'; name?: string }
  | { intent: 'subject_periods'; subject?: string }

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

const hasAny = (norm: string, phrases: string[]) => phrases.some((p) => has(norm, p))

type NamePhrases = { full: string; lastTwo: string; given: string; givenRaw: string }

function phrasesOf(fullName: string): NamePhrases | null {
  const w = words(normalize(fullName))
  if (w.length === 0) return null
  const rawWords = fullName.trim().split(/\s+/)
  return {
    full: w.join(' '),
    lastTwo: w.slice(-2).join(' '),
    given: w[w.length - 1],
    givenRaw: rawWords[rawWords.length - 1].normalize('NFC').toLowerCase(),
  }
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

/** Tên môn hay tên quà dài nhất xuất hiện trong câu hỏi (trả lại đúng cách viết gốc). */
function findCatalogName(norm: string, names: string[]): string | undefined {
  let best: { name: string; len: number } | undefined
  for (const name of names) {
    const n = normalize(name)
    if (n && has(norm, n) && (!best || n.length > best.len)) best = { name, len: n.length }
  }
  return best?.name
}

const WEEKDAY_WORDS: Record<string, number> = { hai: 1, '2': 1, ba: 2, '3': 2, tu: 3, '4': 3, nam: 4, '5': 4, sau: 5, '6': 5, bay: 6, '7': 6 }
const WEEKDAY_RE = /\bthu (hai|ba|tu|nam|sau|bay|[2-7])\b/

const hasDayWord = (norm: string) => has(norm, 'hom nay') || has(norm, 'ngay mai') || has(norm, 'chu nhat') || WEEKDAY_RE.test(norm)

function detectDay(norm: string): TimetableDay {
  if (has(norm, 'hom nay')) return 'today'
  if (has(norm, 'ngay mai')) return 'tomorrow'
  if (has(norm, 'chu nhat')) return 0
  const m = WEEKDAY_RE.exec(norm)
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
const PAST_PHRASES = ['hom qua', 'tuan qua', 'thang qua', 'nam qua', 'qua tuan', 'qua thang', 'qua nam', 'qua roi', 'qua nhieu', 'qua it']

/** Câu hỏi có nhắc tới môn học hoặc quà không, để route chỉ tải danh sách môn và quà khi cần. */
export function needsCatalog(text: string): boolean {
  return hasAny(normalize(text), ['tiet', 'mon', 'mon hoc', 'qua', 'phan thuong'])
}

/** Hiểu câu hỏi bằng luật, không gọi mạng. Trả null khi không khớp kiểu câu nào. */
export function matchIntent(text: string, roster: RosterEntry[], catalog: Catalog = EMPTY_CATALOG): ChatIntent | null {
  const norm = normalize(text)
  if (!norm) return null

  // Sĩ số và cô chủ nhiệm đứng đầu để chữ "sao" nghĩa "tại sao" không bị hiểu là hỏi số sao.
  if (
    has(norm, 'si so') ||
    hasAny(norm, ['bao nhieu hoc sinh', 'may hoc sinh', 'tong so hoc sinh']) ||
    (has(norm, 'lop') && hasAny(norm, ['bao nhieu ban', 'may ban', 'bao nhieu em']))
  ) {
    return { intent: 'class_size' }
  }
  if (has(norm, 'chu nhiem')) return { intent: 'teacher_name' }

  const wholeClass = has(norm, 'ca lop') || has(norm, 'toan lop') || (has(norm, 'lop') && has(norm, 'tong'))
  if (has(norm, 'sao') && wholeClass && !has(norm, 'nhat') && !has(norm, 'xep hang')) {
    return { intent: 'class_stars', period: has(norm, 'thang') ? 'month' : 'week' }
  }

  const asksTop =
    has(norm, 'xep hang') ||
    has(norm, 'top') ||
    has(norm, 'dan dau') ||
    (has(norm, 'nhat') && has(norm, 'sao'))
  if (asksTop) return { intent: 'top_stars', period: detectPeriod(norm), limit: detectLimit(norm) }

  // "quà" và "qua" (hôm qua, quá) chuẩn hóa giống nhau nên cần kèm một từ hỏi và loại các cụm chỉ thời gian.
  const asksRewards =
    has(norm, 'phan thuong') ||
    (has(norm, 'qua') &&
      !hasAny(norm, PAST_PHRASES) &&
      hasAny(norm, ['co', 'dang', 'con', 'gia', 'bao nhieu', 'may', 'nhung', 'cac', 'danh sach', 'doi', 'nao', 'gi']))
  if (asksRewards) return { intent: 'rewards', name: findCatalogName(norm, catalog.rewards) }

  if (hasAny(norm, ['bao nhieu tiet', 'may tiet', 'so tiet', 'bao nhieu mon', 'may mon']) && !hasDayWord(norm)) {
    return { intent: 'subject_periods', subject: findCatalogName(norm, catalog.subjects) }
  }

  const asksStars = hasAny(norm, ['bao nhieu sao', 'may sao', 'sao cua', 'co sao', 'duoc sao'])
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
 * Từ thường dùng trong câu hỏi mà cũng là tên gọi ("tuần" và "Tuấn", "mai" và "Mai"). Đứng một mình thì chỉ
 * che khi viết hoa và khớp đúng tên, để "tuần này", "ngày mai" không bị che nhầm.
 */
const COMMON_WORDS = new Set([
  'tuan', 'thang', 'nam', 'mai', 'nay', 'ngay', 'hom', 'thu', 'hoc', 'mon', 'tiet', 'lop', 'co', 'ban', 'em',
  'sao', 'ky', 'gi', 'may', 'bay', 'sau', 'tu', 'hai', 'ba', 'kia', 'anh', 'chi', 'qua', 'nao', 'ai', 'ca',
  'tong', 'so', 'minh', 'toi', 'tui', 'bao', 'nhieu',
])

const stripToken = (s: string) => s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
const isCapitalized = (s: string) => s.length > 0 && s[0] !== s[0].toLowerCase()
const hasMarks = (s: string) => normalize(s).replace(/ /g, '') !== s.toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '')

/**
 * Thay tên học sinh (và cô giáo) trong câu hỏi bằng {HS1}, {HS2}... trước khi gửi cho model bên ngoài.
 * `refs` ghi lại ký hiệu ứng với những mã nào, để đổi ngược khi nhận kết quả.
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
  const matching = (phrase: string) =>
    entries.filter((e) => e.p.full === phrase || e.p.lastTwo === phrase || e.p.given === phrase)

  const tokens = [...text.matchAll(/\S+/g)].map((m) => ({ raw: m[0], norm: normalize(m[0]) }))
  const out: string[] = []
  const refs: Record<string, string[]> = {}
  const symbolFor = new Map<string, string>()

  const allowed = (phrase: string, len: number, token: string) => {
    if (len > 1 || !COMMON_WORDS.has(phrase)) return true
    const word = stripToken(token).normalize('NFC')
    if (!isCapitalized(word)) return false
    // Viết có dấu thì phải đúng dấu của tên ("Tuần" không phải "Tuấn"); viết không dấu thì che.
    return !hasMarks(word) || matching(phrase).some((e) => e.p.givenRaw === word.toLowerCase())
  }

  for (let i = 0; i < tokens.length; ) {
    let hit: { phrase: string; len: number } | null = null
    for (const phrase of phrases) {
      const len = words(phrase).length
      if (i + len > tokens.length) continue
      if (tokens.slice(i, i + len).map((t) => t.norm).join(' ') !== phrase) continue
      if (!allowed(phrase, len, tokens[i].raw)) continue
      hit = { phrase, len }
      break
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
      refs[symbol] = matching(hit.phrase).map((e) => e.id)
    }
    out.push(`{${symbol}}`)
    i += hit.len
  }
  return { masked: out.join(' '), refs }
}
