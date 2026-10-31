'use client'

const SKIP_BYTES = 300 * 1024

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '')
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/** Thu nhỏ ảnh trước khi tải (chỉ chạy ở trình duyệt). */
export async function compressImage(file: File, maxSide = 512): Promise<File> {
  const bitmap = await createImageBitmap(file)
  try {
    const longest = Math.max(bitmap.width, bitmap.height)
    if (file.size <= SKIP_BYTES && longest <= maxSide) return file

    const scale = Math.min(1, maxSide / longest)
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas_unavailable')
    ctx.drawImage(bitmap, 0, 0, w, h)

    let blob = await toBlob(canvas, 'image/webp', 0.85)
    let ext = 'webp'
    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlob(canvas, 'image/jpeg', 0.85)
      ext = 'jpg'
    }
    if (!blob) throw new Error('compress_failed')
    return new File([blob], `${baseName(file.name)}.${ext}`, { type: blob.type })
  } finally {
    bitmap.close()
  }
}
