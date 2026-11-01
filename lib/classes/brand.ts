const BASE = 'TRẠM KHÔNG GIAN'

/** Nguồn duy nhất: "Năm 8 (5/8)" -> "TRẠM KHÔNG GIAN NĂM 8"; không khớp mẫu "Năm N" thì chỉ có "TRẠM KHÔNG GIAN". */
export function brandTitle(cls: { class_name: string }): string {
  const m = /^\s*năm\s+(\d+)/i.exec(cls.class_name ?? '')
  return m ? `${BASE} NĂM ${m[1]}` : BASE
}

/** Hai dòng cho thanh bên: dòng trên và phần nhấn màu vàng (rỗng nếu không có). Suy ra từ brandTitle. */
export function brandLines(cls: { class_name: string }): { top: string; accent: string } {
  return { top: BASE, accent: brandTitle(cls).slice(BASE.length).trim() }
}

/** "Trạm không gian Năm 8" dùng trong câu chào. Suy ra từ brandTitle. */
export function brandSentence(cls: { class_name: string }): string {
  const { accent } = brandLines(cls)
  return accent ? `Trạm không gian Năm ${accent.slice(4)}` : 'Trạm không gian'
}

/** Dòng tên trường: "Trường <tên>", trống thì "Trường học". Cô có gõ sẵn chữ "Trường" thì không lặp lại. */
export function schoolLabel(schoolName: string | null | undefined): string {
  const n = (schoolName ?? '').trim().replace(/^trường\s+/iu, '')
  return n ? `Trường ${n}` : 'Trường học'
}
