import { getRewardPreset } from '@/lib/rewards/presets'
import { RARITY_COLORS } from '@/lib/blind-bag/odds'
import type { RevealGift } from './types'

const W = 768
const H = 1024

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (ctx.measureText(next).width <= maxWidth || !cur) cur = next
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…')
  }
  return lines
}

/** Vẽ mặt trước thẻ quà theo phong cách clay của web: viền màu theo bậc hiếm, hình quà, tên quà, các ngôi sao bậc. */
export async function paintCard(gift: RevealGift): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const accent = RARITY_COLORS[Math.min(Math.max(gift.tier, 0), 4)]

  // Viền clay + gờ đáy
  ctx.fillStyle = accent
  roundRect(ctx, 24, 28, W - 48, H - 48, 72)
  ctx.fill()
  ctx.fillStyle = 'rgba(35,31,77,0.25)'
  roundRect(ctx, 24, 40, W - 48, H - 48, 72)
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#f7fbff'
  roundRect(ctx, 56, 60, W - 112, H - 112, 48)
  ctx.fill()

  // Khung hình quà
  const ax = 92
  const ay = 96
  const aw = W - 184
  const ah = 560
  ctx.save()
  roundRect(ctx, ax, ay, aw, ah, 36)
  ctx.clip()
  let drawn = false
  if (gift.visual.kind === 'image') {
    const img = await loadImage(gift.visual.url)
    if (img) {
      const s = Math.max(aw / img.width, ah / img.height)
      ctx.drawImage(img, ax + (aw - img.width * s) / 2, ay + (ah - img.height * s) / 2, img.width * s, img.height * s)
      drawn = true
    }
  }
  if (!drawn) {
    const preset = getRewardPreset(gift.visual.kind === 'preset' ? gift.visual.key : 'gift') ?? getRewardPreset('gift')!
    const [c1, c2] = preset.gradient.match(/#[0-9a-fA-F]{6}/g) ?? ['#6675E8', '#B9A7F8']
    const g = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    ctx.fillRect(ax, ay, aw, ah)
    const scale = 15
    ctx.translate(ax + aw / 2 - 12 * scale, ay + ah / 2 - 12 * scale)
    ctx.scale(scale, scale)
    const path = new Path2D(preset.path)
    ctx.fillStyle = 'rgba(255,255,255,.28)'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fill(path)
    ctx.stroke(path)
  }
  ctx.restore()

  // Tên quà
  const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'
  ctx.fillStyle = '#231f4d'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 58
  ctx.font = `800 ${size}px ${family}`
  let lines = wrapLines(ctx, gift.name, aw, 2)
  if (lines.length > 1) {
    size = 48
    ctx.font = `800 ${size}px ${family}`
    lines = wrapLines(ctx, gift.name, aw, 2)
  }
  const top = 700
  lines.forEach((l, i) => ctx.fillText(l, W / 2, top + i * (size + 8) + size / 2))

  // Sao bậc hiếm
  const n = gift.tier + 1
  ctx.font = `800 54px ${family}`
  ctx.fillStyle = accent
  ctx.fillText('★'.repeat(n), W / 2, H - 150)
  return canvas
}
