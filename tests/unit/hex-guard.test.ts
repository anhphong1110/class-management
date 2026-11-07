import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import baseline from './hex-baseline.json'

/**
 * Lưới chặn nợ màu: số mã hex trong từng file .tsx không được tăng so với mốc đã chốt (hex-baseline.json).
 * Màu mới nên dùng token (xem app/globals.css, components/ui/tones.ts). Khi giảm được hex, hạ mốc xuống;
 * file mới có hex phải có lý do (hình SVG, màu trang trí) rồi mới thêm vào mốc.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

describe('hex guard', () => {
  const counts: Record<string, number> = {}
  for (const f of [...walk('app'), ...walk('components')]) {
    const n = (readFileSync(f, 'utf8').match(/#[0-9A-Fa-f]{6}\b/g) ?? []).length
    if (n) counts[f] = n
  }
  it('không file nào thêm mã hex so với mốc', () => {
    const base = baseline as Record<string, number>
    const over = Object.entries(counts).filter(([f, n]) => n > (base[f] ?? 0))
    expect(over).toEqual([])
  })
})
