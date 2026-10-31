/** "Năm 8 (5/8)" -> "5/8"; không có ngoặc thì dùng nguyên tên lớp. */
export function classShortName(className: string): string {
  return /\(([^)]+)\)/.exec(className)?.[1].trim() || className
}

/** Suy ra từ resolvePeriod để không lệch với bảng xếp hạng; null = không rõ học kỳ. */
export function termRoman(term: 1 | 2 | null): 'I' | 'II' | null {
  return term === 1 ? 'I' : term === 2 ? 'II' : null
}
