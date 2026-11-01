export type ThemeKey = 'indigo' | 'pink' | 'mint' | 'gold'

/**
 * strong: nền nút và mục đang chọn (chữ trắng trên đó đạt tương phản >= 4.5).
 * soft/ink/deep: màu nhạt và màu chữ đi kèm, đặt sẵn cho từng màu chủ đạo
 * (không dùng color-mix, để indigo giữ đúng các giá trị của thiết kế).
 */
export const THEMES: Record<
  ThemeKey,
  { label: string; primary: string; strong: string; soft: string; ink: string; deep: string }
> = {
  indigo: { label: 'Xanh tím', primary: '#6675E8', strong: '#4F5BD5', soft: '#EEF0FF', ink: '#3441B5', deep: '#2C37A8' },
  pink: { label: 'Hồng sen', primary: '#F46FA5', strong: '#C2407A', soft: '#F9ECF2', ink: '#9B3362', deep: '#882D55' },
  mint: { label: 'Xanh mint', primary: '#2BB5A4', strong: '#12796B', soft: '#E7F2F0', ink: '#0E6156', deep: '#0D554B' },
  gold: { label: 'Vàng sao', primary: '#F5A81C', strong: '#8F5A00', soft: '#F4EFE6', ink: '#724800', deep: '#643F00' },
}

export function themeVars(theme: string | null | undefined): Record<string, string> {
  const t = theme && Object.hasOwn(THEMES, theme) ? THEMES[theme as ThemeKey] : THEMES.indigo
  return {
    '--primary': t.primary,
    '--primary-strong': t.strong,
    '--primary-soft': t.soft,
    '--primary-ink': t.ink,
    '--primary-deep': t.deep,
  }
}
