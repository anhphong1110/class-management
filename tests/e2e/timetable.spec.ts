import { expect, test, type Page } from '@playwright/test'
import * as XLSX from 'xlsx'
import { login } from './helpers'
import { CLASS_ID, resetTimetable, seedSlot, sql } from './helpers/ledger'
import { todayInVietnam } from '../../lib/domain/date'

test.describe.configure({ mode: 'serial' })
test.beforeEach(resetTimetable)
test.afterAll(resetTimetable)

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/thoi-khoa-bieu')
  await expect(page.getByRole('heading', { level: 1, name: 'Lịch bay của phi hành gia' })).toBeVisible()
}

const cell = (page: Page, weekday: number, session: 'morning' | 'afternoon', period: number) =>
  page.getByTestId(`cell-${weekday}-${session}-${period}`)
const nameInput = (page: Page, name: string) => page.locator(`[data-testid=subject-row] input[value="${name}"]`)
const rows = (page: Page) => page.getByTestId('subject-row')

test('Cả tuần: 5 cột thứ, hai buổi, 8 hàng tiết, không có giờ', async ({ page }, info) => {
  seedSlot(1, 'morning', 1, 'Toán')
  seedSlot(1, 'morning', 2, 'Tiếng Việt')
  seedSlot(2, 'morning', 1, 'Tiếng Anh')
  seedSlot(3, 'afternoon', 2, 'Thể dục')
  seedSlot(4, 'morning', 4, 'Khoa học')
  await open(page)
  const heads = page.getByTestId('day-head')
  await expect(heads).toHaveText(['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'])
  const grid = page.getByTestId('timetable-grid')
  await expect(grid).toContainText('BUỔI SÁNG · 5 TIẾT')
  await expect(grid).toContainText('BUỔI CHIỀU')
  await expect(page.getByTestId('period-row')).toHaveCount(8)
  await expect(page.getByTestId('period-row').nth(5)).toContainText('Tiết 1')
  await expect(grid).not.toContainText(/\d{1,2}[:h]\d{2}/)
  await expect(page.getByText('Học sinh chỉ được xem.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sao chép thời khóa biểu' })).toHaveCount(0)
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: 'test-results/timetable-desktop.png', fullPage: true })
  }
})

test('cột thứ hôm nay được tô #4F5BD5', async ({ page }) => {
  await open(page)
  const dow = new Date(`${todayInVietnam()}T00:00:00Z`).getUTCDay() // 0 = Chủ Nhật
  const today = page.locator('[data-testid=day-head][data-today=true]')
  if (dow >= 1 && dow <= 5) {
    await expect(today).toHaveCount(1)
    await expect(today).toHaveCSS('background-color', 'rgb(37, 99, 235)')
  } else {
    await expect(today).toHaveCount(0)
  }
})

test('Theo ngày: chip thứ chọn một cột', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Theo ngày' }).click()
  await page.getByRole('button', { name: 'Thứ Ba', exact: true }).click()
  await expect(page.getByTestId('day-head')).toHaveText(['Thứ Ba'])
  await expect(page.getByTestId('period-row').first().getByTestId(/^cell-/)).toHaveCount(1)
})

test('sửa một ô: chọn môn, ô nhận màu của môn, tải lại vẫn còn', async ({ page }) => {
  await open(page)
  await cell(page, 1, 'morning', 1).click()
  const panel = page.getByRole('region', { name: 'Sửa tiết học' })
  await expect(panel).toContainText('Đang sửa: Thứ Hai, sáng tiết 1')
  await panel.getByLabel('Chọn môn học').selectOption({ label: 'Toán' })
  await expect(cell(page, 1, 'morning', 1)).toHaveText('Toán')
  await expect(cell(page, 1, 'morning', 1)).toHaveCSS('background-color', 'rgb(232, 235, 255)')
  await expect(cell(page, 1, 'morning', 1)).toHaveCSS('color', 'rgb(44, 55, 168)')
  await page.reload()
  await expect(cell(page, 1, 'morning', 1)).toHaveText('Toán')
  // chọn lại ô trống thì xóa
  await cell(page, 1, 'morning', 1).click()
  await page.getByLabel('Chọn môn học').selectOption({ label: '— Trống —' })
  await expect(cell(page, 1, 'morning', 1)).not.toHaveText('Toán')
  await page.getByRole('button', { name: 'Xong' }).click()
  await expect(page.getByRole('region', { name: 'Sửa tiết học' })).toHaveCount(0)
})

test('danh sách môn: thêm, trùng tên, đổi tên theo ô, đổi màu', async ({ page }) => {
  seedSlot(1, 'morning', 1, 'Toán')
  await open(page)
  await expect(rows(page)).toHaveCount(12)
  const newBox = page.getByLabel('Tên môn mới')
  await page.getByRole('button', { name: '+ Thêm môn' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Cô hãy nhập tên môn học.' })).toBeVisible()
  await newBox.fill('Kĩ năng sống')
  await page.getByRole('button', { name: '+ Thêm môn' }).click()
  await expect(nameInput(page, 'Kĩ năng sống')).toBeVisible()
  await expect(rows(page)).toHaveCount(13)
  await newBox.fill('toán')
  await page.getByRole('button', { name: '+ Thêm môn' }).click()
  await expect(page.getByRole('status')).toHaveText('Môn "toán" đã có trong danh sách.')
  await expect(rows(page)).toHaveCount(13)

  const toan = nameInput(page, 'Toán')
  await toan.fill('Toán học')
  await toan.press('Enter')
  await expect(nameInput(page, 'Toán học')).toBeVisible()
  await expect(cell(page, 1, 'morning', 1)).toHaveText('Toán học')

  const swatch = page.getByRole('button', { name: 'Đổi màu môn Toán học' })
  await expect(swatch).toHaveCSS('border-top-color', 'rgb(44, 55, 168)')
  await swatch.click()
  await expect(swatch).toHaveCSS('border-top-color', 'rgb(142, 27, 59)')
  await expect(cell(page, 1, 'morning', 1)).toHaveCSS('color', 'rgb(142, 27, 59)')
})

test('xóa môn: đang dùng thì bị chặn, chưa dùng thì biến mất', async ({ page }) => {
  seedSlot(1, 'morning', 1, 'Toán')
  await open(page)
  await page.getByRole('button', { name: 'Xóa môn Toán' }).click()
  await page.getByRole('dialog', { name: 'Xóa môn học này?' }).getByRole('button', { name: 'Xóa môn' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Môn "Toán" đang có trong thời khóa biểu. Cô hãy đổi các tiết đó sang môn khác trước khi xóa.',
  )
  await expect(nameInput(page, 'Toán')).toBeVisible()
  await page.getByRole('button', { name: 'Xóa môn Âm nhạc' }).click()
  await page.getByRole('dialog', { name: 'Xóa môn học này?' }).getByRole('button', { name: 'Xóa môn' }).click()
  await expect(nameInput(page, 'Âm nhạc')).toHaveCount(0)
  await expect(rows(page)).toHaveCount(11)
})

test('In / Xuất: tải file .xlsx có môn ở đúng ô', async ({ page }) => {
  seedSlot(1, 'morning', 1, 'Toán')
  seedSlot(2, 'afternoon', 3, 'Tin học')
  sql(`update public.subjects set name = 'Toán học' where class_id = '${CLASS_ID}' and name = 'Toán'`)
  await open(page)
  await page.getByRole('button', { name: 'In / Xuất' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Tải Excel/ }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^thoi-khoa-bieu-lop-.+\.xlsx$/)
  const wb = XLSX.readFile((await download.path())!)
  const aoa = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Thời khóa biểu'], { header: 1, defval: '' })
  expect(aoa[0]).toEqual(['Tiết', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'])
  expect(aoa[2][1]).toBe('Toán học')
  expect(aoa[10][2]).toBe('Tin học')
})

test('đổi tên trùng hoặc để trống: báo lỗi và ô trả về tên cũ', async ({ page }) => {
  await open(page)
  const toan = nameInput(page, 'Toán')
  await toan.fill('Tiếng Việt')
  await toan.press('Enter')
  await expect(page.getByRole('status')).toHaveText('Môn "Tiếng Việt" đã có trong danh sách.')
  await expect(toan).toHaveValue('Toán')
  await toan.fill('   ')
  await toan.press('Enter')
  await expect(page.getByRole('status')).toHaveText('Cô hãy nhập tên môn học.')
  await expect(toan).toHaveValue('Toán')
})

test('thứ Bảy: bật trong cài đặt thì có cột thứ 6, sửa được và xuất ra file', async ({ page }) => {
  await open(page)
  await expect(page.getByTestId('day-head')).toHaveCount(5)
  sql(`update public.class_settings set timetable_saturday = true where class_id = '${CLASS_ID}'`)
  await page.reload()
  await expect(page.getByTestId('day-head')).toHaveCount(6)
  await expect(page.getByTestId('day-head').last()).toHaveText('Thứ Bảy')
  await cell(page, 6, 'morning', 1).click()
  await page.getByLabel('Chọn môn học').selectOption({ label: 'Thể dục' })
  await expect(cell(page, 6, 'morning', 1)).toHaveText('Thể dục')
  await page.getByRole('button', { name: 'In / Xuất' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Tải Excel/ }).click(),
  ])
  const wb = XLSX.readFile((await download.path())!)
  const aoa = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Thời khóa biểu'], { header: 1, defval: '' })
  expect(aoa[0]).toHaveLength(7)
  expect(aoa[2][6]).toBe('Thể dục')
})

test('thứ Bảy tắt: không lưu được tiết thứ Bảy (server từ chối)', async ({ page }) => {
  await open(page)
  sql(`update public.class_settings set timetable_saturday = true where class_id = '${CLASS_ID}'`)
  await page.reload()
  await cell(page, 6, 'morning', 1).click()
  sql(`update public.class_settings set timetable_saturday = false where class_id = '${CLASS_ID}'`)
  await page.getByLabel('Chọn môn học').selectOption({ label: 'Toán' })
  await expect(page.getByRole('region', { name: 'Sửa tiết học' }).getByRole('alert')).toHaveText('Lớp chưa bật học thứ Bảy.')
})

test('in: lưới đủ rộng, không còn thanh bên', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'bản in dùng khổ ngang, kiểm tra ở màn hình rộng')
  seedSlot(5, 'morning', 1, 'Toán')
  await open(page)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('aside')).toBeHidden()
  await expect(page.getByRole('button', { name: 'In / Xuất' })).toBeHidden()
  const box = (await page.locator('[data-testid=day-head]', { hasText: 'Thứ Sáu' }).boundingBox())!
  const vw = page.viewportSize()!.width
  expect(box.x + box.width).toBeLessThanOrEqual(vw)
  const scroll = page.getByTestId('timetable-scroll')
  expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})

test('in ở bề rộng 1050px: lưới nằm gọn trong trang', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'bản in dùng khổ ngang, kiểm tra ở màn hình rộng')
  seedSlot(5, 'morning', 1, 'Toán')
  await page.setViewportSize({ width: 1050, height: 800 })
  await open(page)
  await page.emulateMedia({ media: 'print' })
  const box = (await page.locator('[data-testid=day-head]', { hasText: 'Thứ Sáu' }).boundingBox())!
  expect(box.x + box.width).toBeLessThanOrEqual(1050)
  const scroll = page.getByTestId('timetable-scroll')
  expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})

test('in ở chế độ Theo ngày: chỉ in ngày đang xem', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'bản in dùng khổ ngang, kiểm tra ở màn hình rộng')
  seedSlot(3, 'morning', 1, 'Toán')
  await open(page)
  await page.getByRole('button', { name: 'Theo ngày' }).click()
  await page.getByRole('button', { name: 'Thứ Tư', exact: true }).click()
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByTestId('day-head')).toHaveText(['Thứ Tư'])
  await expect(page.getByRole('button', { name: 'Thứ Tư', exact: true })).toBeHidden()
})

test('điện thoại: trang không cuộn ngang, lưới tự cuộn', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'chỉ kiểm tra ở màn hình điện thoại')
  await open(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(await page.getByTestId('timetable-scroll').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
})
