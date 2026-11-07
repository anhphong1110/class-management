export type ThemeKey = 'indigo' | 'pink' | 'mint' | 'gold'

/**
 * strong: nền nút và mục đang chọn (chữ trắng trên đó đạt tương phản >= 4.5).
 * soft/ink/deep: màu nhạt và màu chữ đi kèm, đặt sẵn cho từng màu chủ đạo
 * (không dùng color-mix, để giữ đúng giá trị đã kiểm tra tương phản).
 * bg: nền trang pastel; edge: màu viền và gờ đáy của thẻ/nút "đất sét".
 * Khóa `indigo` được giữ nguyên vì đã lưu trong cơ sở dữ liệu; nhãn hiển thị là "Xanh trời".
 */
export const THEMES: Record<
  ThemeKey,
  { label: string; primary: string; strong: string; soft: string; ink: string; deep: string; bg: string; edge: string }
> = {
  indigo: { label: 'Xanh trời', primary: '#4DA3FF', strong: '#2563EB', soft: '#E0EEFF', ink: '#1D4ED8', deep: '#1E40AF', bg: '#EEF7FF', edge: '#CFE3FF' },
  pink: { label: 'Hồng sen', primary: '#F46FA5', strong: '#C2407A', soft: '#FFE6F1', ink: '#9B3362', deep: '#882D55', bg: '#FFF4F8', edge: '#F7CADF' },
  mint: { label: 'Xanh mint', primary: '#2BB5A4', strong: '#12796B', soft: '#DDF7F1', ink: '#0E6156', deep: '#0D554B', bg: '#EEFBF8', edge: '#BDEBE2' },
  gold: { label: 'Vàng sao', primary: '#F5A81C', strong: '#8F5A00', soft: '#FFF1CC', ink: '#724800', deep: '#643F00', bg: '#FFF9EA', edge: '#F3DDA0' },
}

export function themeVars(theme: string | null | undefined): Record<string, string> {
  const t = theme && Object.hasOwn(THEMES, theme) ? THEMES[theme as ThemeKey] : THEMES.indigo
  return {
    '--primary': t.primary,
    '--primary-strong': t.strong,
    '--primary-soft': t.soft,
    '--primary-ink': t.ink,
    '--primary-deep': t.deep,
    '--primary-bg': t.bg,
    '--primary-edge': t.edge,
  }
}
