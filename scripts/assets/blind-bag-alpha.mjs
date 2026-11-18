// Tách nền ô caro đã in cứng trong ảnh túi mù thành kênh alpha thật, xuất WebP vào public/blind-bag/.
// Chạy: node scripts/assets/blind-bag-alpha.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const DIR = fileURLToPath(new URL('../../public/blind-bag/', import.meta.url))
const FILES = ['bag-front', 'bag-back', 'card-back', 'tear-edge']

// Nền ô caro: xám/trắng, gần như không có màu. Túi/thẻ có màu xanh/vàng/tím nên bị loại khỏi nền.
const isCheck = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 14 && Math.min(r, g, b) > 90

for (const name of FILES) {
  const { data, info } = await sharp(`${DIR}${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const bg = new Uint8Array(w * h)
  const stack = []
  const push = (x, y) => {
    const i = y * w + x
    if (bg[i]) return
    const o = i * 4
    if (!isCheck(data[o], data[o + 1], data[o + 2])) return
    bg[i] = 1
    stack.push(i)
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  while (stack.length) {
    const i = stack.pop()
    const x = i % w, y = (i / w) | 0
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }
  // Làm mềm mép 1px: pixel giữ lại kề nền thì alpha giảm một nửa.
  const out = Buffer.from(data)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = i * 4
    if (bg[i]) { out[o + 3] = 0; continue }
    const near = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w])
    if (near) out[o + 3] = 128
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${DIR}${name}.webp`)
  const kept = bg.reduce((a, v) => a + (v ? 0 : 1), 0)
  console.log(name, `${w}x${h}`, 'giữ lại', ((kept / (w * h)) * 100).toFixed(1) + '%')
}
