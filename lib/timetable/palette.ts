/** 11 cặp màu môn học của thiết kế (Timetable.dc.html). `subjects.color` lưu màu chữ (`ink`). */
export type SubjectColor = { bg: string; ink: string }

export const SUBJECT_PALETTE: SubjectColor[] = [
  ['#E8EBFF', '#2C37A8'], ['#FFE3EE', '#8E1B3B'], ['#DDF6F1', '#0B5A4D'], ['#E3F4FF', '#0F5E8F'],
  ['#FFF1CC', '#6E4700'], ['#F0E8FF', '#5E35B1'], ['#FFE6D6', '#7A3510'], ['#FFDDF4', '#7E1D69'],
  ['#E9E5FF', '#4A33A8'], ['#E6F5D9', '#2B6110'], ['#EDEDF7', '#3A3769'],
].map(([bg, ink]) => ({ bg, ink }))

/** Cặp có màu chữ `ink` (không phân biệt hoa thường); không thấy thì cặp cuối. */
export function paletteFor(ink: string): SubjectColor {
  const want = ink.toLowerCase()
  return SUBJECT_PALETTE.find((p) => p.ink.toLowerCase() === want) ?? SUBJECT_PALETTE[SUBJECT_PALETTE.length - 1]
}

/** Màu chữ của cặp kế tiếp, đi vòng. */
export function nextInk(ink: string): string {
  const i = SUBJECT_PALETTE.indexOf(paletteFor(ink))
  return SUBJECT_PALETTE[(i + 1) % SUBJECT_PALETTE.length].ink
}
