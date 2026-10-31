import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID, resetMissions, resetStars, sid } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

function reset() {
  resetStars()
  resetMissions()
}
test.beforeEach(reset)
test.afterAll(reset)

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/nhiem-vu')
  await expect(page.getByRole('heading', { level: 1, name: 'Nhiệm vụ phi hành gia' })).toBeVisible()
}

const card = (page: Page, name: string) => page.getByTestId('mission-card').filter({ hasText: name })
const alert = (page: Page, text: string) => page.getByRole('alert').filter({ hasText: text })
const status = (page: Page, text: string) => page.getByRole('status').filter({ hasText: text })

/** Sao thi đua = tổng các dòng cộng, trừ và hoàn tác của học sinh (view v_student_stars cần phiên đăng nhập nên không dùng service role). */
async function stars(studentNo: number) {
  const { data, error } = await admin()
    .from('star_transactions')
    .select('delta')
    .eq('student_id', sid(studentNo))
    .in('kind', ['award', 'penalty', 'reversal'])
  if (error) throw error
  return (data ?? []).reduce((sum, r) => sum + r.delta, 0)
}

test('công tắc tính năng, tạo nhiệm vụ, ghi nhận hoàn thành, tạm dừng', async ({ page }) => {
  await open(page)

  const sw = page.getByRole('switch', { name: 'Tính năng nhiệm vụ' })
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Đang bật', { exact: true })).toBeVisible()
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('Đang tắt', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Tính năng nhiệm vụ' })).toHaveAttribute('aria-checked', 'false')
  await page.getByRole('switch', { name: 'Tính năng nhiệm vụ' }).click()
  await expect(page.getByRole('switch', { name: 'Tính năng nhiệm vụ' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Đang bật', { exact: true })).toBeVisible()

  // Thiếu điều kiện
  await page.getByLabel('Tên nhiệm vụ').fill('Đọc sách')
  await page.getByRole('button', { name: '+ Thêm nhiệm vụ' }).click()
  await expect(alert(page, 'Cô hãy nhập tên và điều kiện hoàn thành.')).toBeVisible()
  await expect(page.getByTestId('mission-card')).toHaveCount(5)

  await page.getByLabel('Thời gian').selectOption({ label: 'Tuần này' })
  await page.getByLabel('Thưởng (sao)').fill('2')
  await page.getByLabel('Điều kiện hoàn thành').fill('Đọc 1 cuốn sách và kể lại.')
  await page.getByRole('button', { name: '+ Thêm nhiệm vụ' }).click()
  await expect(status(page, 'Đã thêm nhiệm vụ mới.')).toBeVisible()
  await expect(page.getByTestId('mission-card')).toHaveCount(6)
  const mine = card(page, 'Đọc sách').filter({ hasNotText: 'Đọc sách trong tuần' })
  await expect(mine).toContainText('Tuần này')
  await expect(mine).toContainText('+2 sao khi hoàn thành')
  await expect(mine).toContainText('0/10 bạn đã hoàn thành')

  // Ghi nhận cho Võ Hà My
  await page.getByLabel('Ghi nhận cho').selectOption({ label: 'Võ Hà My' })
  await mine.getByRole('button', { name: 'Ghi nhận thêm 1 bạn' }).click()
  await expect(mine).toContainText('1/10 bạn đã hoàn thành')
  expect(await stars(5)).toBe(2)

  // Lần hai cùng kỳ
  await mine.getByRole('button', { name: 'Ghi nhận thêm 1 bạn' }).click()
  await expect(alert(page, 'Bạn này đã hoàn thành nhiệm vụ trong kỳ này.')).toBeVisible()
  await expect(mine).toContainText('1/10 bạn đã hoàn thành')
  expect(await stars(5)).toBe(2)

  // Tạm dừng / mở lại
  await mine.getByRole('button', { name: 'Tạm dừng' }).click()
  await expect(mine.getByRole('button', { name: 'Mở lại' })).toBeVisible()
  await expect(mine).toHaveCSS('opacity', '0.55')
  await mine.getByRole('button', { name: 'Mở lại' }).click()
  await expect(mine.getByRole('button', { name: 'Tạm dừng' })).toBeVisible()
})

test('trao huy hiệu không cộng sao, trao lần hai báo lỗi', async ({ page }) => {
  await open(page)
  await page.getByLabel('Trao cho').selectOption({ label: 'Võ Hà My' })
  const badge = page.getByTestId('badge-card').filter({ hasText: 'Người bạn tốt' })
  await expect(badge).toContainText('0 bạn đã đạt')
  await badge.getByRole('button', { name: 'Trao huy hiệu' }).click()
  await expect(status(page, 'Đã trao "Người bạn tốt" cho Võ Hà My. Huy hiệu không tự cộng sao.')).toBeVisible()
  await expect(badge).toContainText('1 bạn đã đạt')
  expect(await stars(5)).toBe(0)

  await badge.getByRole('button', { name: 'Trao huy hiệu' }).click()
  await expect(alert(page, 'Bạn này đã có huy hiệu này.')).toBeVisible()
  await expect(badge).toContainText('1 bạn đã đạt')

  const { count } = await admin().from('student_badges').select('id', { count: 'exact', head: true }).eq('class_id', CLASS_ID)
  expect(count).toBe(1)
})

test('ảnh chụp màn hình bản desktop', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.setViewportSize({ width: 1360, height: 1500 })
  await open(page)
  await expect(page.getByTestId('mission-card')).toHaveCount(5)
  await page.screenshot({ path: 'test-results/missions-desktop.png', fullPage: true })
})
