// Phần thuần của scripts/bootstrap-class.ts: không đọc process.env, không gọi mạng, import được trong test.
import { normalizeUsername } from '../../lib/auth/username'

export const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AUTH_EMAIL_DOMAIN',
  'SCHOOL_NAME',
  'CLASS_NAME',
  'SCHOOL_YEAR',
  'TEACHER_NAME',
  'TEACHER_USERNAME',
  'TEACHER_PASSWORD',
] as const

// Giữ khớp với avatar_library trong supabase/seed.sql (test so sánh hai nơi).
export const AVATAR_PRESETS: { preset: Record<string, string>; label: string }[] = [
  { preset: { hair: 'b', hairColor: '#6B3F2A', skin: '#FFD9B8', bg: '#FFD6E8' }, label: 'Bạn nữ' },
  { preset: { hair: 'a', hairColor: '#2B2B3B', skin: '#F5C49C', bg: '#CFF3EC' }, label: 'Bạn nam' },
]

type Env = Record<string, string | undefined>

export type BootstrapConfig = {
  supabaseUrl: string
  serviceKey: string
  schoolName: string
  className: string
  schoolYear: string
  teacherName: string
  teacherUsername: string
  teacherPassword: string
  term1Start: string | null
  term1End: string | null
  term2Start: string | null
  term2End: string | null
}

export function missingEnv(env: Env): string[] {
  return REQUIRED_ENV.filter((k) => !env[k] || env[k]!.trim() === '')
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function optionalDate(env: Env, key: string): { ok: true; value: string | null } | { ok: false } {
  const v = env[key]?.trim()
  if (!v) return { ok: true, value: null }
  const valid = DATE_RE.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v
  return valid ? { ok: true, value: v } : { ok: false }
}

// Thông báo lỗi không bao giờ chứa giá trị của TEACHER_PASSWORD.
export function parseBootstrapEnv(
  env: Env,
): { ok: true; value: BootstrapConfig } | { ok: false; error: string } {
  const missing = missingEnv(env)
  if (missing.length > 0) return { ok: false, error: `Thiếu biến môi trường: ${missing.join(', ')}` }

  const password = env.TEACHER_PASSWORD!
  if (password.length < 8) return { ok: false, error: 'TEACHER_PASSWORD cần tối thiểu 8 ký tự.' }

  const u = normalizeUsername(env.TEACHER_USERNAME!)
  if (!u.ok) {
    return {
      ok: false,
      error: 'TEACHER_USERNAME chỉ gồm chữ không dấu, số, dấu chấm và gạch dưới (3–32 ký tự).',
    }
  }

  const dates: Record<string, string | null> = {}
  for (const k of ['TERM1_START', 'TERM1_END', 'TERM2_START', 'TERM2_END']) {
    const d = optionalDate(env, k)
    if (!d.ok) return { ok: false, error: `${k} phải có dạng YYYY-MM-DD (ví dụ 2026-09-05).` }
    dates[k] = d.value
  }

  // Thứ tự: học kỳ 1 bắt đầu <= kết thúc < học kỳ 2 bắt đầu <= kết thúc (bỏ qua ngày để trống).
  const present = ['TERM1_START', 'TERM1_END', 'TERM2_START', 'TERM2_END'].filter((k) => dates[k])
  const inOrder = present.every((k, i) => {
    if (i === 0) return true
    const prev = present[i - 1]
    // Chỉ TERM1_END -> TERM2_START phải nghiêm ngặt (<); còn lại cho phép bằng nhau.
    return prev === 'TERM1_END' && k === 'TERM2_START' ? dates[prev]! < dates[k]! : dates[prev]! <= dates[k]!
  })
  if (!inOrder) {
    return { ok: false, error: 'Ngày học kỳ phải theo thứ tự: TERM1_START ≤ TERM1_END < TERM2_START ≤ TERM2_END.' }
  }

  return {
    ok: true,
    value: {
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      serviceKey: env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      schoolName: env.SCHOOL_NAME!.trim(),
      className: env.CLASS_NAME!.trim(),
      schoolYear: env.SCHOOL_YEAR!.trim(),
      teacherName: env.TEACHER_NAME!.trim(),
      teacherUsername: u.username,
      teacherPassword: password,
      term1Start: dates.TERM1_START,
      term1End: dates.TERM1_END,
      term2Start: dates.TERM2_START,
      term2End: dates.TERM2_END,
    },
  }
}

export function buildClassRow(cfg: BootstrapConfig, ownerId: string) {
  return {
    school_name: cfg.schoolName,
    class_name: cfg.className,
    school_year: cfg.schoolYear,
    teacher_name: cfg.teacherName,
    theme: 'indigo' as const,
    term1_start: cfg.term1Start,
    term1_end: cfg.term1End,
    term2_start: cfg.term2Start,
    term2_end: cfg.term2End,
    owner_id: ownerId,
  }
}

export function buildAvatarRows(classId: string) {
  return AVATAR_PRESETS.map((a) => ({
    class_id: classId,
    kind: 'preset' as const,
    preset: a.preset,
    label: a.label,
    is_demo: false,
  }))
}
