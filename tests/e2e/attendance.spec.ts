import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID, resetAttendance, seedAttendance, sid } from './helpers/ledger'
import { formatVietnameseDate, todayInVietnam } from '../../lib/domain/date'

test.describe.configure({ mode: 'serial' })

const today = todayInVietnam()
const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const code = (n: number) => `HS${String(n).padStart(2, '0')}`
const card = (page: Page, n: number) => page.getByTestId(`att-card-${code(n)}`)
const status = (page: Page, n: number) => page.getByTestId(`att-status-${code(n)}`)

async function open(page: Page, query = '') {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto(`/diem-danh${query}`)
  await expect(page.getByText('Ngày điểm danh', { exact: true })).toBeVisible()
}

async function dbRows(date = today) {
  const { data, error } = await admin().from('attendance').select('student_id, status').eq('class_id', CLASS_ID).eq('date', date)
  if (error) throw error
  return data ?? []
}

test.beforeEach(() => resetAttendance())
test.afterAll(() => resetAttendance())

test('mặc định là hôm nay và mọi bạn chưa điểm danh', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Điểm danh phi hành đoàn' })).toBeVisible()
  await expect(page.getByText(formatVietnameseDate(new Date()), { exact: true }).first()).toBeVisible()
  for (let n = 1; n <= 10; n++) await expect(status(page, n)).toHaveText('Chưa điểm danh')
  await expect(page.getByTestId('total-unmarked')).toHaveText('10')
})

test('Tất cả có mặt chỉ điền trên màn hình, Lưu mới ghi xuống', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Tất cả có mặt' }).click()
  for (let n = 1; n <= 10; n++) await expect(status(page, n)).toHaveText('Có mặt')
  expect(await dbRows()).toHaveLength(0)
  await page.getByRole('button', { name: 'Lưu điểm danh' }).click()
  await expect(page.getByRole('status').filter({ hasText: `Đã lưu điểm danh ngày ${dmy(today)}.` })).toBeVisible()
  const rows = await dbRows()
  expect(rows).toHaveLength(10)
  expect(rows.every((r) => r.status === 'present')).toBe(true)
})

test('sửa một bạn, bỏ chọn một bạn rồi lưu lại: 9 dòng, tổng kết và lịch sử đúng', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Tất cả có mặt' }).click()
  await page.getByRole('button', { name: 'Lưu điểm danh' }).click()
  await expect(page.getByText(`Đã lưu điểm danh ngày ${dmy(today)}.`)).toBeVisible()

  await card(page, 2).getByRole('button', { name: 'Đi trễ' }).click()
  await card(page, 3).getByRole('button', { name: 'Có mặt' }).click()
  await expect(status(page, 3)).toHaveText('Chưa điểm danh')
  await page.getByRole('button', { name: 'Lưu điểm danh' }).click()
  await expect(page.getByText(`Đã lưu điểm danh ngày ${dmy(today)}.`)).toBeVisible()

  const rows = await dbRows()
  expect(rows).toHaveLength(9)
  expect(rows.find((r) => r.student_id === sid(2))?.status).toBe('late')
  expect(rows.find((r) => r.student_id === sid(3))).toBeUndefined()

  await expect(page.getByTestId('total-all')).toHaveText('10')
  await expect(page.getByTestId('total-present')).toHaveText('8')
  await expect(page.getByTestId('total-late')).toHaveText('1')
  await expect(page.getByTestId('total-unmarked')).toHaveText('1')

  await page.reload()
  await expect(status(page, 2)).toHaveText('Đi trễ')
  await expect(status(page, 3)).toHaveText('Chưa điểm danh')
  await expect(page.getByRole('heading', { name: 'Lịch sử điểm danh theo ngày' })).toBeVisible()
  const hist = page.getByTestId(`history-${today}`)
  await expect(hist).toContainText('8 có mặt')
  await expect(hist).toContainText('0 vắng')
  await expect(hist).toContainText('0 có phép')
  await expect(hist).toContainText('1 đi trễ')
})

test('chỉnh sửa một ngày cũ', async ({ page }) => {
  const old = shift(today, -3)
  seedAttendance(1, 'present', 3)
  seedAttendance(2, 'absent_unexcused', 3)
  await open(page)
  await page.getByTestId(`history-${old}`).getByRole('link', { name: 'Chỉnh sửa' }).click()
  await expect(page).toHaveURL(new RegExp(`ngay=${old}`))
  await expect(status(page, 2)).toHaveText('Vắng không phép')
  await card(page, 2).getByRole('button', { name: 'Vắng có phép' }).click()
  await page.getByRole('button', { name: 'Lưu điểm danh' }).click()
  await expect(page.getByText(`Đã lưu điểm danh ngày ${dmy(old)}.`)).toBeVisible()
  const rows = await dbRows(old)
  expect(rows).toHaveLength(2)
  expect(rows.find((r) => r.student_id === sid(2))?.status).toBe('absent_excused')
})

test('chọn ngày mai thì lưu báo lỗi ngày tương lai', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Chọn ngày' }).click()
  const input = page.getByLabel('Chọn ngày điểm danh')
  await expect(input).toHaveAttribute('max', today)
  await input.fill(shift(today, 1))
  await expect(page).toHaveURL(new RegExp(`ngay=${shift(today, 1)}`))
  await page.getByRole('button', { name: 'Tất cả có mặt' }).click()
  await page.getByRole('button', { name: 'Lưu điểm danh' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Chưa thể điểm danh cho ngày trong tương lai.' })).toBeVisible()
  expect(await dbRows(shift(today, 1))).toHaveLength(0)
})

test('lịch tháng hiện số ngày đã điểm danh; bấm ngày của tháng trước mở đúng ngày đó', async ({ page }) => {
  const dayOfMonth = Number(today.slice(8, 10))
  const prevLast = shift(today, -dayOfMonth) // ngày cuối của tháng trước, đúng cả khi hôm nay là mùng 1
  seedAttendance(1, 'present', 0)
  seedAttendance(2, 'late', 0)
  seedAttendance(1, 'absent_excused', dayOfMonth)
  seedAttendance(2, 'present', dayOfMonth)
  await open(page)
  await expect(page.getByRole('heading', { name: 'Lịch tháng' })).toBeVisible()
  await expect(page.getByTestId('calendar-days-marked')).toContainText('1 ngày')
  await expect(page.getByTestId(`cal-${today}`)).toContainText('1/10')
  await page.getByRole('link', { name: 'Tháng trước' }).click()
  await expect(page).toHaveURL(new RegExp(`thang=${prevLast.slice(0, 7)}`))
  await expect(page.getByTestId('calendar-days-marked')).toContainText('1 ngày')
  await page.getByTestId(`cal-${prevLast}`).click()
  await expect(page).toHaveURL(new RegExp(`ngay=${prevLast}`))
  await expect(status(page, 1)).toHaveText('Vắng có phép')
  await expect(status(page, 2)).toHaveText('Có mặt')
  await expect(status(page, 3)).toHaveText('Chưa điểm danh')
  await expect(card(page, 1).getByRole('button', { name: 'Vắng có phép' })).toHaveAttribute('aria-pressed', 'true')
})

test('lưu là ảnh chụp đầy đủ: DB đổi từ nơi khác sau khi tải trang thì DB khớp màn hình', async ({ page }) => {
  seedAttendance(1, 'present', 0)
  await open(page)
  await expect(status(page, 1)).toHaveText('Có mặt')
  // Một nơi khác đổi dữ liệu sau khi trang đã tải.
  seedAttendance(5, 'late', 0)
  await card(page, 2).getByRole('button', { name: 'Vắng không phép' }).click()
  await page.getByRole('button', { name: 'Lưu điểm danh' }).click()
  await expect(page.getByText(`Đã lưu điểm danh ngày ${dmy(today)}.`)).toBeVisible()
  const rows = await dbRows()
  const byStudent = new Map(rows.map((r) => [r.student_id, r.status]))
  expect(rows).toHaveLength(2)
  expect(byStudent.get(sid(1))).toBe('present')
  expect(byStudent.get(sid(2))).toBe('absent_unexcused')
  expect(byStudent.has(sid(5))).toBe(false)
  await expect(status(page, 5)).toHaveText('Chưa điểm danh')
})

test('Xuất CSV tải file có tiêu đề đúng', async ({ page }) => {
  seedAttendance(1, 'present', 0)
  seedAttendance(2, 'absent_excused', 0)
  await open(page)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Xuất CSV' }).click()])
  expect(download.suggestedFilename()).toMatch(new RegExp(`^diem-danh-.+-${today.slice(0, 7)}\\.csv$`))
  const text = readFileSync(await download.path(), 'utf8')
  expect(text.charCodeAt(0)).toBe(0xfeff)
  const lines = text.slice(1).split('\r\n')
  expect(lines[0]).toBe(`Mã học sinh,Họ và tên,${today.slice(8, 10)}/${today.slice(5, 7)},Có mặt,Vắng không phép,Vắng có phép,Đi trễ`)
  expect(lines[1]).toMatch(/^HS01,.+,C,1,0,0,0$/)
  expect(lines[2]).toMatch(/^HS02,.+,P,0,0,1,0$/)
})
