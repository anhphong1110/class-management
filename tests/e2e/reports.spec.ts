import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import * as XLSX from 'xlsx'
import { login } from './helpers'
import {
  CLASS_ID, resetAttendance, resetRewards, resetStars, seedAttendance, seedDelta, seedStars, sid, sql,
} from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

function reset() {
  resetStars()
  resetAttendance()
  return resetRewards()
}
test.beforeEach(reset)
test.afterAll(reset)

async function open(page: Page, query = '') {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto(`/bao-cao${query}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Thống kê – Báo cáo' })).toBeVisible()
}

const kpi = (page: Page, label: string) => page.getByTestId('kpi').filter({ hasText: label })

function seedRedeem(studentNo: number, rewardNo: number, status: 'approved' | 'delivered' | 'pending', daysAgo = 0) {
  const decided = status === 'pending' ? 'null' : `now() - interval '${daysAgo} days'`
  sql(`insert into public.reward_requests (class_id, student_id, reward_id, cost, status, decided_at)
       values ('${CLASS_ID}', '${sid(studentNo)}', '00000000-0000-0000-0000-0000000e000${rewardNo}', 10, '${status}', ${decided})`)
}

test('KPI "Sao đã cộng" đúng +n, kèm trừ sao, chuyên cần và đổi quà', async ({ page }, info) => {
  seedStars(1, 5)
  seedStars(2, 4)
  seedStars(3, 3)
  seedDelta(3, -2)
  seedAttendance(1, 'present')
  seedAttendance(2, 'late')
  seedAttendance(3, 'absent_excused')
  seedAttendance(4, 'absent_unexcused')
  seedRedeem(1, 1, 'approved')
  seedRedeem(2, 2, 'delivered')
  seedRedeem(2, 1, 'pending')
  await open(page, '?ky=month')
  await expect(page.getByRole('tab', { name: 'Tháng này' })).toHaveAttribute('aria-selected', 'true')
  await expect(kpi(page, 'Sao đã cộng')).toContainText('+12')
  await expect(kpi(page, 'Sao đã trừ')).toContainText('-2')
  await expect(kpi(page, 'Tỉ lệ chuyên cần')).toContainText('50%')
  await expect(kpi(page, 'Lượt đổi quà')).toContainText('2')
  await expect(page.getByRole('heading', { name: 'Sao cộng và sao trừ theo tuần' })).toBeVisible()
  await expect(page.getByText('Cần quan tâm (vắng nhiều nhất)')).toBeVisible()
  await expect(page.getByText('1 buổi vắng')).toHaveCount(2)
  await expect(page.getByTestId('report-bar').first()).toBeVisible()
  if (info.project.name === 'desktop') await page.screenshot({ path: 'test-results/reports-desktop.png', fullPage: true })
})

test('tab Tuần này: cộng đúng +n, biểu đồ theo ngày có 7 mốc từ Thứ 2 tới CN', async ({ page }) => {
  seedStars(1, 5)
  seedStars(2, 2)
  await open(page)
  await page.getByRole('tab', { name: 'Tuần này' }).click()
  await expect(page).toHaveURL(/ky=week/)
  await expect(kpi(page, 'Sao đã cộng')).toContainText('+7')
  await expect(page.getByRole('heading', { name: 'Sao cộng và sao trừ theo ngày' })).toBeVisible()
  await expect(page.getByTestId('report-bar')).toHaveCount(7)
  await expect(page.getByTestId('report-bar').first()).toContainText('Thứ 2')
  await expect(page.getByTestId('report-bar').last()).toContainText('CN')
})

test('Xuất CSV và Xuất Excel tải về file đúng tên và đúng nội dung', async ({ page }) => {
  seedStars(1, 5)
  await open(page, '?ky=week')
  await expect(kpi(page, 'Sao đã cộng')).toContainText('+5')

  const csvWait = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất CSV' }).click()
  const csv = await csvWait
  expect(csv.suggestedFilename()).toMatch(/^bao-cao-tuan-nay-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/)
  const text = readFileSync(await csv.path(), 'utf8')
  expect(text.charCodeAt(0)).toBe(0xfeff)
  expect(text).toContain('Sao đã cộng,5')

  const xlsxWait = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất Excel' }).click()
  const xlsx = await xlsxWait
  expect(xlsx.suggestedFilename()).toMatch(/^bao-cao-tuan-nay-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.xlsx$/)
  const wb = XLSX.readFile(await xlsx.path())
  expect(wb.SheetNames).toEqual(['KPI', 'Theo thời gian', 'Chuyên cần', 'Tiêu chí', 'Tiến bộ', 'Đổi quà'])
})

test('Chọn ngày: hộp thoại hai ô ngày, "Xem báo cáo" mở khoảng đã chọn', async ({ page }) => {
  seedStars(1, 5, 3)
  await open(page)
  await page.getByRole('button', { name: 'Chọn ngày' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Từ ngày')).toBeVisible()
  await expect(dialog.getByLabel('Đến ngày')).toBeVisible()
  await dialog.getByLabel('Từ ngày').fill('2026-03-10')
  await dialog.getByLabel('Đến ngày').fill('2026-03-05')
  await dialog.getByRole('button', { name: 'Xem báo cáo' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Khoảng ngày chưa hợp lệ')
  await dialog.getByLabel('Từ ngày').fill('2026-01-01')
  await dialog.getByLabel('Đến ngày').fill('2027-02-05')
  await dialog.getByRole('button', { name: 'Xem báo cáo' }).click()
  await expect(dialog.getByRole('alert')).toContainText('tối đa 400 ngày')
  await dialog.getByLabel('Từ ngày').fill('2026-03-01')
  await dialog.getByLabel('Đến ngày').fill('2026-03-05')
  await dialog.getByRole('button', { name: 'Xem báo cáo' }).click()
  await expect(page).toHaveURL(/ky=custom&tu=2026-03-01&den=2026-03-05/)
  await expect(page.getByRole('button', { name: 'Chọn ngày' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('report-bar')).toHaveCount(5)
})

test('khoảng ngày không có dữ liệu: mọi KPI là 0, không có NaN, vẫn xuất được', async ({ page }) => {
  seedStars(1, 5)
  await open(page, '?ky=custom&tu=2020-01-01&den=2020-01-07')
  await expect(kpi(page, 'Sao đã cộng')).toContainText('+0')
  await expect(kpi(page, 'Sao đã trừ')).toContainText('-0')
  await expect(kpi(page, 'Tỉ lệ chuyên cần')).toContainText('0%')
  await expect(kpi(page, 'Lượt đổi quà')).toContainText(/^Lượt đổi quà0$/)
  await expect(kpi(page, 'Học sinh tiến bộ')).toContainText(/^Học sinh tiến bộ0$/)
  await expect(page.getByTestId('report-bar')).toHaveCount(7)
  await expect(page.getByTestId('report-bar').first()).toContainText('Thứ 4')
  await expect(page.getByText('Chưa có lượt đổi quà nào trong kỳ này.')).toBeVisible()
  const body = await page.locator('main, body').first().innerText()
  expect(body).not.toMatch(/NaN|Infinity/)
  const heights = await page.getByTestId('report-bar').evaluateAll((els) => els.map((e) => e.innerHTML))
  expect(heights.join('')).not.toMatch(/NaN|Infinity/)

  const csvWait = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất CSV' }).click()
  const csv = await csvWait
  expect(csv.suggestedFilename()).toBe('bao-cao-chon-ngay-2020-01-01-2020-01-07.csv')
  expect(readFileSync(await csv.path(), 'utf8')).not.toMatch(/NaN|Infinity/)

  const xlsxWait = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất Excel' }).click()
  expect((await xlsxWait).suggestedFilename()).toBe('bao-cao-chon-ngay-2020-01-01-2020-01-07.xlsx')
})

test('khoảng ngày sai trên địa chỉ: báo lỗi, không có số liệu, không xuất được', async ({ page }) => {
  await open(page, '?ky=custom&tu=2026-03-10&den=2026-03-05')
  await expect(page.getByRole('alert').filter({ hasText: 'Khoảng ngày chưa hợp lệ' })).toBeVisible()
  await expect(page.getByTestId('kpi')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Xuất CSV' })).toBeDisabled()
})

test('tab Học kỳ và Cả năm dùng ngày học kỳ trong Cài đặt', async ({ page }) => {
  await open(page)
  await page.getByRole('tab', { name: 'Học kỳ' }).click()
  await expect(page).toHaveURL(/ky=term/)
  await expect(page.getByRole('heading', { name: 'Sao cộng và sao trừ theo tháng' })).toBeVisible()
  await page.getByRole('tab', { name: 'Cả năm' }).click()
  await expect(page).toHaveURL(/ky=year/)
  await expect(page.getByRole('heading', { name: 'Sao cộng và sao trừ theo tháng' })).toBeVisible()
  await expect(kpi(page, 'Sao đã cộng')).toBeVisible()
})
