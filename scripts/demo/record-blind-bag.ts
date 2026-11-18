/**
 * Quay clip cảnh xé túi mù ở khung điện thoại rồi xuất GIF vào presentation/blind-bag-demo.gif.
 * Cần: Supabase local + `pnpm dev` đang chạy (hoặc để Playwright tự bật), ffmpeg.
 * Chạy: pnpm exec tsx scripts/demo/record-blind-bag.ts
 * Script này đổi tạm dữ liệu của lớp demo (sao, túi mù) rồi trả về như cũ, giống các spec e2e.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { admin, login } from '../../tests/e2e/helpers'
import { CLASS_ID, resetRewards, resetStars, seedStars } from '../../tests/e2e/helpers/ledger'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = 'presentation/blind-bag-demo.gif'
const FLAGS = ['feature_blind_bag', 'feature_rewards', 'student_can_view_rewards', 'weekly_redeem_limit']

async function setSettings(values: Record<string, boolean | number>) {
  const { error } = await admin().from('class_settings').update(values).eq('class_id', CLASS_ID)
  if (error) throw error
}

async function main() {
  const { data: original } = await admin().from('class_settings').select(FLAGS.join(',')).eq('class_id', CLASS_ID).single()
  const videoDir = mkdtempSync(join(tmpdir(), 'blind-bag-video-'))
  try {
    resetStars()
    await resetRewards()
    await setSettings({ feature_rewards: true, student_can_view_rewards: true, feature_blind_bag: true, weekly_redeem_limit: 20 })
    // Trộn đủ bậc hiếm: 10 / 15 / 25 / 30 / 50 sao.
    const ids = [1, 2, 3, 4, 5].map((n) => `00000000-0000-0000-0000-0000000e000${n}`)
    await admin().from('rewards').update({ in_blind_bag: true }).in('id', ids)
    seedStars(5, 100)

    const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
    const ctxStart = Date.now()
    const context = await browser.newContext({
      baseURL: BASE,
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
      recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
    })
    const page = await context.newPage()
    await login(page, 'Học sinh', 'hs.hamy')
    await page.waitForURL(/\/em$/)
    await page.goto('/em/doi-qua')
    await page.getByTestId('blind-bag-card').scrollIntoViewIfNeeded()
    await page.getByTestId('blind-bag-card').getByRole('button', { name: 'Mở túi mù' }).click()
    await page.getByRole('dialog', { name: 'Mở túi mù?' }).getByRole('button', { name: 'Mở túi' }).click()
    const stage = page.getByTestId('blind-bag-stage')
    await stage.waitFor()
    const openedAt = Date.now()
    await page.waitForSelector('[data-testid="blind-bag-stage"][data-stage="ready"], [data-testid="blind-bag-stage"][data-stage="fallback"]', { timeout: 20_000 })
    const mode = await stage.getAttribute('data-stage')
    console.log('stage:', mode)
    await page.waitForTimeout(600)

    const y = 844 * 0.3
    await page.mouse.move(60, y)
    await page.mouse.down()
    for (let i = 1; i <= 40; i++) {
      await page.mouse.move(60 + (270 * i) / 40, y + Math.sin(i / 4) * 5)
      await page.waitForTimeout(18)
    }
    await page.mouse.up()
    await page.waitForSelector('[data-testid="blind-bag-stage"][data-stage="revealed"]', { timeout: 25_000 })
    await page.waitForTimeout(1500)
    await context.close()
    await browser.close()

    const file = readdirSync(videoDir).find((f) => f.endsWith('.webm'))!
    const start = Math.max((openedAt - ctxStart) / 1000 - 0.4, 0)
    mkdirSync('presentation', { recursive: true })
    const palette = join(videoDir, 'palette.png')
    const filters = 'fps=15,scale=320:-1:flags=lanczos'
    execFileSync('ffmpeg', ['-y', '-ss', String(start), '-i', join(videoDir, file), '-vf', `${filters},palettegen=max_colors=96:stats_mode=diff`, palette], { stdio: 'pipe' })
    execFileSync('ffmpeg', ['-y', '-ss', String(start), '-i', join(videoDir, file), '-i', palette, '-lavfi', `${filters} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5`, OUT], { stdio: 'pipe' })
    console.log('Đã ghi', OUT)
  } finally {
    resetStars()
    await resetRewards()
    await setSettings(original as unknown as Record<string, boolean | number>)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
