/** "Năm 8 (5/8)" -> "5/8"; không có ngoặc thì dùng nguyên tên lớp. */
export function classShortName(className: string): string {
  return /\(([^)]+)\)/.exec(className)?.[1].trim() || className
}

/** "Học kỳ II" khi đã tới ngày bắt đầu học kỳ 2, ngược lại "Học kỳ I". */
export function termRoman(term2Start: string | null, now: Date): 'I' | 'II' {
  if (!term2Start) return 'I'
  return now.getTime() >= new Date(`${term2Start}T00:00:00+07:00`).getTime() ? 'II' : 'I'
}
