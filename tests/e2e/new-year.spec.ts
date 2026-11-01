import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID } from './helpers/ledger'

// Không chạy thật việc mở năm học và xóa dữ liệu demo: chúng phá dữ liệu seed dùng chung cho mọi test khác.
// Hiệu ứng thật được kiểm trong pgTAP (supabase/tests/21_new_year.test.sql); ở đây chỉ kiểm hộp thoại và đường "Hủy".
test.describe.configure({ mode: 'serial' })

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/cai-dat')
  await expect(page.getByRole('heading', { name: 'Năm học và dữ liệu' })).toBeVisible()
}

async function snapshot() {
  const db = admin()
  const classes = await db.from('classes').select('id', { count: 'exact', head: true })
  const archived = await db.from('classes').select('id', { count: 'exact', head: true }).not('archived_at', 'is', null)
  const demo = await db.from('students').select('id', { count: 'exact', head: true }).eq('class_id', CLASS_ID).eq('is_demo', true)
  const profile = await db.from('profiles').select('class_id').eq('username', 'co.khanh').single()
  expect(classes.error ?? archived.error ?? demo.error ?? profile.error).toBeNull()
  return { classes: classes.count, archived: archived.count, demo: demo.count, teacherClass: profile.data?.class_id }
}

test('mở form năm mới: năm gợi ý đúng, mặc định chọn hết trừ Thời khóa biểu, "Hủy" không đổi gì', async ({ page }) => {
  const before = await snapshot()
  expect(before.demo).toBe(10)
  await open(page)

  await page.getByRole('button', { name: /^Lưu trữ năm học 2026 – 2027/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Mở năm học mới' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Năm học')).toHaveValue('2027 – 2028')
  await expect(dialog.getByLabel('Tên lớp')).not.toHaveValue('')
  await expect(dialog.getByLabel('Giáo viên chủ nhiệm')).not.toHaveValue('')

  for (const name of ['Môn học', 'Tiêu chí sao', 'Phần thưởng', 'Thư viện avatar', 'Cài đặt', 'Nhiệm vụ & huy hiệu']) {
    await expect(dialog.getByRole('checkbox', { name })).toBeChecked()
  }
  await expect(dialog.getByRole('checkbox', { name: 'Thời khóa biểu' })).not.toBeChecked()

  // Thời khóa biểu cần có Môn học: bỏ Môn học thì Thời khóa biểu bị khóa.
  await dialog.getByRole('checkbox', { name: 'Môn học' }).uncheck()
  await expect(dialog.getByRole('checkbox', { name: 'Thời khóa biểu' })).toBeDisabled()
  await dialog.getByRole('checkbox', { name: 'Môn học' }).check()
  await expect(dialog.getByRole('checkbox', { name: 'Thời khóa biểu' })).toBeEnabled()
  await expect(dialog.getByRole('button', { name: 'Lưu trữ và mở năm mới' })).toBeEnabled()

  await dialog.getByRole('button', { name: 'Hủy' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/cai-dat$/)
  expect(await snapshot()).toEqual(before)
})

test('"Xóa dữ liệu demo" có hộp hỏi, "Hủy" thì vẫn còn 10 học sinh', async ({ page }, testInfo) => {
  const before = await snapshot()
  await open(page)

  const trigger = page.getByRole('button', { name: /^Xóa dữ liệu demo/ })
  await expect(trigger).toBeEnabled()
  await expect(trigger).toContainText('Xóa 10 học sinh mẫu để nhập danh sách thật. Cần xác nhận.')
  if (testInfo.project.name === 'desktop') await page.screenshot({ path: 'test-results/settings-data-desktop.png', fullPage: true })

  await trigger.click()
  const dialog = page.getByRole('dialog', {
    name: 'Xóa toàn bộ dữ liệu mẫu (10 học sinh mẫu và dữ liệu đi kèm)? Không hoàn tác được.',
  })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Xóa dữ liệu demo' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Hủy' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const after = await snapshot()
  expect(after.demo).toBe(10)
  expect(after).toEqual(before)
})

test('học sinh không thấy mục Cài đặt', async ({ page }) => {
  await login(page, 'Học sinh', 'hs.minhanh')
  await page.goto('/cai-dat')
  await expect(page.getByRole('button', { name: /Lưu trữ năm học/ })).toHaveCount(0)
})
