const BASE = 'TRẠM KHÔNG GIAN'

type BrandSource = { class_name: string; brand_title?: string | null }

/** Tên trạm cô tự đặt trong Cài đặt (đã cắt khoảng trắng); trống thì null. */
function customTitle(cls: BrandSource): string | null {
  return cls.brand_title?.trim() || null
}

/**
 * Nguồn duy nhất. Có brand_title thì dùng nó (in hoa); không thì suy ra từ tên lớp:
 * "Năm 8 (5/8)" -> "TRẠM KHÔNG GIAN NĂM 8"; không khớp mẫu "Năm N" thì chỉ có "TRẠM KHÔNG GIAN".
 */
export function brandTitle(cls: BrandSource): string {
  const custom = customTitle(cls)
  if (custom) return custom.toLocaleUpperCase('vi')
  const m = /^\s*năm\s+(\d+)/i.exec(cls.class_name ?? '')
  return m ? `${BASE} NĂM ${m[1]}` : BASE
}

/**
 * Hai dòng cho thanh bên: dòng trên và phần nhấn màu vàng (rỗng nếu không có). Suy ra từ brandTitle.
 * Tên bắt đầu bằng "Trạm không gian" thì phần còn lại là dòng nhấn; tên khác thì cả tên là dòng trên.
 */
export function brandLines(cls: BrandSource): { top: string; accent: string } {
  const title = brandTitle(cls)
  if (title.startsWith(BASE)) return { top: BASE, accent: title.slice(BASE.length).trim() }
  return { top: title, accent: '' }
}

/** "Trạm không gian Năm 8" dùng trong câu chào. Tên cô tự đặt giữ nguyên chữ cô gõ. */
export function brandSentence(cls: BrandSource): string {
  const custom = customTitle(cls)
  if (custom) return custom
  const { accent } = brandLines(cls)
  return accent ? `Trạm không gian Năm ${accent.slice(4)}` : 'Trạm không gian'
}

/** Dòng tên trường: "Trường <tên>", trống thì "Trường học". Cô có gõ sẵn chữ "Trường" thì không lặp lại. */
export function schoolLabel(schoolName: string | null | undefined): string {
  const n = (schoolName ?? '').trim().replace(/^trường\s+/iu, '')
  return n ? `Trường ${n}` : 'Trường học'
}
