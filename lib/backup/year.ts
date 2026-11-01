/** Các mục có thể chép sang năm học mới (khớp tham số `copy` của start_new_school_year). */
export const COPY_OPTIONS = [
  { key: 'subjects', label: 'Môn học' },
  { key: 'timetable', label: 'Thời khóa biểu' },
  { key: 'criteria', label: 'Tiêu chí sao' },
  { key: 'rewards', label: 'Phần thưởng' },
  { key: 'avatars', label: 'Thư viện avatar' },
  { key: 'settings', label: 'Cài đặt' },
  { key: 'missions', label: 'Nhiệm vụ & huy hiệu' },
] as const

export type CopyKey = (typeof COPY_OPTIONS)[number]['key']
export const COPY_KEYS = COPY_OPTIONS.map((o) => o.key) as [CopyKey, ...CopyKey[]]

/** Mặc định chọn hết, trừ Thời khóa biểu. */
export const DEFAULT_COPY: CopyKey[] = COPY_KEYS.filter((k) => k !== 'timetable')

/** "2026 – 2027" -> "2027 – 2028". Không đọc được thì trả chuỗi rỗng để giáo viên tự nhập. */
export function nextSchoolYear(year: string): string {
  const m = /(\d{4})\s*[–-]\s*(\d{4})/.exec(year)
  if (!m) return ''
  return `${Number(m[1]) + 1} – ${Number(m[2]) + 1}`
}
