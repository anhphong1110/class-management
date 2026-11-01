const BASE = 'TRẠM KHÔNG GIAN'

function yearOf(className: string): string {
  const m = /^\s*năm\s+(\d+)/i.exec(className ?? '')
  return m ? `NĂM ${m[1]}` : ''
}

/** "Năm 8 (5/8)" -> "TRẠM KHÔNG GIAN NĂM 8"; không khớp mẫu "Năm N" thì chỉ có "TRẠM KHÔNG GIAN". */
export function brandTitle(cls: { class_name: string }): string {
  const y = yearOf(cls.class_name)
  return y ? `${BASE} ${y}` : BASE
}

/** Hai dòng cho thanh bên: dòng trên và phần nhấn màu vàng (rỗng nếu không có). */
export function brandLines(cls: { class_name: string }): { top: string; accent: string } {
  return { top: BASE, accent: yearOf(cls.class_name) }
}

/** "Trạm không gian Năm 8" dùng trong câu chào. */
export function brandSentence(cls: { class_name: string }): string {
  const y = yearOf(cls.class_name)
  return y ? `Trạm không gian Năm ${y.slice(4)}` : 'Trạm không gian'
}
