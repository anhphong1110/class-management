import { clamp, smoothstep } from '@/lib/blind-bag/easing'

/**
 * Uốn dải xé quanh một trụ có bán kính nhỏ dần theo tiến độ (port từ CrownCard `deformStrip`).
 * `bendStart` là phần gần điểm neo vẫn phẳng, đóng vai bản lề.
 */
export function deformStrip(
  positions: Float32Array,
  base: Float32Array,
  minX: number,
  maxX: number,
  rip: number,
  fall: number,
  direction: 1 | -1,
  pullX: number,
  pullY: number,
): void {
  const peel = smoothstep(rip, 0.06, 0.92)
  const foldBehind = fall * fall * (3 - 2 * fall)
  const curlAngle = peel * (Math.PI * 0.56 + foldBehind * Math.PI * 0.52)
  const width = Math.max(1e-3, maxX - minX)
  const bendStart = 0.22
  const freeLength = width * (1 - bendStart)
  const radius = curlAngle > 0.001 ? freeLength / curlAngle : freeLength
  const anchorX = direction === 1 ? maxX - width * bendStart : minX + width * bendStart

  for (let o = 0; o < positions.length; o += 3) {
    const bx = base[o]
    const by = base[o + 1]
    const bz = base[o + 2]
    const nx = clamp((bx - minX) / width, 0, 1)
    const along = direction === 1 ? 1 - nx : nx
    positions[o] = bx
    positions[o + 1] = by
    positions[o + 2] = bz
    if (along <= bendStart || curlAngle <= 0.001) continue

    const bp = (along - bendStart) / (1 - bendStart)
    const angle = bp * curlAngle
    const curledDistance = radius * Math.sin(angle)
    const curlDepth = radius * (1 - Math.cos(angle))
    const arch = Math.sin(bp * Math.PI) ** 2 * width * 0.016 * peel
    const ripple = Math.sin(bp * Math.PI * 1.6) * width * 0.02 * peel * bp
    const flutter = Math.sin((bp * 2.2 + fall * 2.8) * Math.PI) * width * 0.022 * fall * bp
    const hingeDrop = foldBehind * width * 0.16 * bp
    const behindDepth = foldBehind * width * 0.34 * bp
    const dragInfluence = (1 - foldBehind) * peel * bp
    const dragX = pullX * width * 0.14 * dragInfluence
    const dragY = -pullY * width * 0.18 * dragInfluence
    const dragDepth = Math.abs(pullY) * width * 0.07 * dragInfluence

    positions[o] = anchorX - direction * curledDistance + dragX
    positions[o + 1] = by + arch + ripple + flutter + dragY - hingeDrop
    positions[o + 2] = bz + curlDepth * (0.82 - foldBehind * 1.42) + dragDepth - behindDepth
  }
}
