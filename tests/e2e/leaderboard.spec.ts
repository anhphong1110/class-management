import { expect, test, type Page } from '@playwright/test'
import { login } from './helpers'
import { resetStars, seedStars } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

async function open(page: Page, query = '') {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto(`/xep-hang${query}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Bảng xếp hạng' })).toBeVisible()
}

const podium = (page: Page) => page.getByTestId('podium')
const rows = (page: Page) => page.getByTestId('rank-row')

test.beforeEach(resetStars)
test.afterAll(resetStars)

function seedScenario() {
  seedStars(1, 5)
  seedStars(2, 5)
  seedStars(3, 3)
  seedStars(4, 10, 40)
}

test('tab Tuần này: A và B cùng hạng 1, C hạng 3', async ({ page }, info) => {
  seedScenario()
  await open(page)
  await page.getByRole('tab', { name: 'Tuần này' }).click()
  await expect(page).toHaveURL(/ky=week/)
  const steps = podium(page).getByTestId('podium-step')
  await expect(steps).toHaveCount(3)
  await expect(steps.filter({ hasText: 'Nguyễn Minh Anh' })).toContainText('Huy chương vàng')
  await expect(steps.filter({ hasText: 'Nguyễn Minh Anh' })).toContainText('5 sao')
  await expect(steps.filter({ hasText: 'Trần Gia Bảo' })).toContainText('Huy chương vàng')
  await expect(steps.filter({ hasText: 'Lê Khánh Chi' })).toContainText('Huy chương đồng')
  await expect(steps.filter({ hasText: 'Lê Khánh Chi' }).getByTestId('podium-rank')).toHaveText('3')
  await expect(page.getByText('Bằng điểm thì cùng thứ hạng. Hệ thống không ưu tiên theo giới tính hay tên.')).toBeVisible()
  if (info.project.name === 'desktop') await page.screenshot({ path: 'test-results/leaderboard-desktop.png', fullPage: true })
})

test('tab Cả năm: D đứng đầu với 10 sao', async ({ page }) => {
  seedScenario()
  await open(page, '?ky=week')
  await page.getByRole('tab', { name: 'Cả năm' }).click()
  await expect(page.getByRole('tab', { name: 'Cả năm' })).toHaveAttribute('aria-selected', 'true')
  await expect(rows(page).first()).toContainText('Phạm Đức Dũng')
  await expect(rows(page).first()).toContainText('10')
})

test('mặc định là Cả năm, 5 dòng, xem toàn bộ rồi thu lại', async ({ page }) => {
  seedScenario()
  await open(page)
  await expect(page.getByRole('tab', { name: 'Cả năm' })).toHaveAttribute('aria-selected', 'true')
  await expect(rows(page)).toHaveCount(5)
  await expect(page.getByRole('heading', { name: 'Top 5 ngôi sao sáng nhất' })).toBeVisible()
  await page.getByRole('button', { name: 'Xem toàn bộ bảng' }).click()
  await expect(rows(page)).toHaveCount(10)
  await expect(page.getByRole('heading', { name: 'Toàn bộ bảng xếp hạng (10 bạn)' })).toBeVisible()
  await page.getByRole('button', { name: 'Chỉ xem Top 5' }).click()
  await expect(rows(page)).toHaveCount(5)
})

test('lớp chưa có giao dịch: mọi bạn 0 sao, cùng hạng 1', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Xem toàn bộ bảng' }).click()
  await expect(rows(page)).toHaveCount(10)
  for (const r of await rows(page).all()) {
    await expect(r.getByTestId('rank-badge')).toHaveText('1')
    await expect(r.getByTestId('rank-stars')).toHaveText('0')
  }
  await expect(podium(page).getByTestId('podium-step')).toHaveCount(3)
})
