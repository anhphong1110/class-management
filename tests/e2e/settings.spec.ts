import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID, resetTimetable, seedSlot, sql } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

const FLAGS = [
  'require_approval', 'reserve_on_request', 'only_enough', 'feature_missions', 'feature_random', 'feature_display',
  'feature_rewards', 'student_can_view_profile', 'student_can_view_history', 'student_can_view_rank',
  'student_can_view_rewards', 'student_can_view_timetable', 'student_can_view_news', 'student_can_view_attendance',
  'weekly_redeem_limit', 'star_steps', 'timetable_saturday',
]
const INFO = 'school_name, class_name, school_year, teacher_name, slogan, theme, term1_start, term1_end, term2_start, term2_end, logo_path, class_logo_path, cover_path'

let flags: Record<string, unknown> = {}
let info: Record<string, unknown> = {}

async function restore() {
  const db = admin()
  const a = await db.from('class_settings').update(flags).eq('class_id', CLASS_ID)
  const b = await db.from('classes').update(info).eq('id', CLASS_ID)
  expect(a.error).toBeNull()
  expect(b.error).toBeNull()
  const store = db.storage.from('class-media')
  const { data } = await store.list(`${CLASS_ID}/branding`)
  if (data?.length) await store.remove(data.map((f) => `${CLASS_ID}/branding/${f.name}`))
}

test.beforeAll(async () => {
  const db = admin()
  const a = await db.from('class_settings').select(FLAGS.join(',')).eq('class_id', CLASS_ID).single()
  const b = await db.from('classes').select(INFO).eq('id', CLASS_ID).single()
  expect(a.error).toBeNull()
  expect(b.error).toBeNull()
  flags = a.data as unknown as Record<string, unknown>
  info = b.data as unknown as Record<string, unknown>
})
test.afterEach(restore)
test.afterAll(async () => {
  resetTimetable()
  await restore()
})

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/cai-dat')
  await expect(page.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeVisible()
}

const saved = (page: Page) => page.getByRole('status').filter({ hasText: 'Đã lưu cài đặt.' })

test('sửa Slogan và lưu thông tin, tải lại vẫn thấy', async ({ page }, testInfo) => {
  await open(page)
  const slogan = page.getByLabel('Slogan')
  await slogan.fill('Slogan thử nghiệm')
  await page.getByLabel('Học kỳ 1 bắt đầu').fill('2026-09-05')
  await page.getByRole('button', { name: 'Lưu thông tin' }).click()
  await expect(saved(page)).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Slogan')).toHaveValue('Slogan thử nghiệm')
  await expect(page.getByLabel('Học kỳ 1 bắt đầu')).toHaveValue('2026-09-05')
  const shot = ({ mobile: 'settings-mobile', desktop: 'settings-desktop' } as Record<string, string | undefined>)[testInfo.project.name]
  if (shot) await page.screenshot({ path: `test-results/${shot}.png`, fullPage: true })
})

test('ngày học kỳ sai thứ tự báo lỗi', async ({ page }) => {
  await open(page)
  await page.getByLabel('Học kỳ 1 bắt đầu').fill('2027-03-01')
  await page.getByLabel('Học kỳ 1 kết thúc').fill('2027-01-01')
  await page.getByRole('button', { name: 'Lưu thông tin' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Ngày học kỳ chưa hợp lý' })).toBeVisible()
})

test('chọn "Xanh mint" thì nút chính đổi màu', async ({ page }) => {
  await open(page)
  const save = page.getByRole('button', { name: 'Lưu thông tin' })
  await expect(save).toHaveCSS('background-color', 'rgb(79, 91, 213)')
  await page.getByRole('button', { name: 'Xanh mint' }).click()
  await expect(saved(page)).toBeVisible()
  await expect(save).toHaveCSS('background-color', 'rgb(18, 121, 107)')
  await expect(page.getByRole('button', { name: 'Xanh mint' })).toHaveAttribute('aria-pressed', 'true')
})

test('tắt "Trạm đổi quà" thì học sinh mở /em/doi-qua bị 404', async ({ page, browser }) => {
  await open(page)
  await page.getByRole('switch', { name: 'Trạm đổi quà' }).click()
  await expect(saved(page)).toBeVisible()
  const ctx = await browser.newContext()
  const sp = await ctx.newPage()
  await login(sp, 'Học sinh', 'hs.hamy')
  await expect(sp).toHaveURL(/\/em$/)
  const res = await sp.goto('/em/doi-qua')
  expect(res?.status()).toBe(404)
  await ctx.close()
})

test('tắt "Bảng xếp hạng" ở mục "Học sinh được xem" thì mục biến khỏi menu học sinh', async ({ page, browser }) => {
  await open(page)
  await page.getByRole('switch', { name: 'Bảng xếp hạng' }).click()
  await expect(saved(page)).toBeVisible()
  const ctx = await browser.newContext()
  const sp = await ctx.newPage()
  await login(sp, 'Học sinh', 'hs.hamy')
  await expect(sp).toHaveURL(/\/em$/)
  await expect(sp.getByRole('navigation', { name: 'Menu học sinh' }).getByRole('link', { name: 'Bảng xếp hạng' })).toHaveCount(0)
  await ctx.close()
})

test('lượt đổi quà mỗi tuần = 0 thì hiện câu invalid_redeem_limit', async ({ page }) => {
  await open(page)
  const input = page.getByLabel('Tối đa lượt đổi quà mỗi tuần')
  await input.fill('0')
  await input.blur()
  await expect(page.getByRole('alert').filter({ hasText: 'Số lượt đổi quà mỗi tuần phải từ 1 đến 20.' })).toBeVisible()
  await input.fill('3')
  await input.blur()
  await expect(saved(page)).toBeVisible()
})

test('thêm mức 7 thì "+7" xuất hiện ở /thi-dua', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: '+ Thêm mức' }).click()
  await page.getByLabel('Mức sao mới').fill('7')
  await page.getByRole('button', { name: 'Thêm', exact: true }).click()
  await expect(saved(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xóa mức +7' })).toBeVisible()
  await page.goto('/thi-dua')
  await expect(page.getByText('+7', { exact: true }).first()).toBeVisible()
})

test('tắt thứ Bảy khi còn tiết: hỏi trước; "Hủy" giữ nguyên, "Xóa và tắt" xóa tiết rồi tắt', async ({ page }) => {
  resetTimetable()
  sql(`update public.class_settings set timetable_saturday = false where class_id = '${CLASS_ID}'`)
  await open(page)
  const sw = page.getByRole('switch', { name: 'Lớp học thứ Bảy' })
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await sw.click()
  await expect(saved(page)).toBeVisible()
  await expect(sw).toHaveAttribute('aria-checked', 'true')

  seedSlot(6, 'morning', 1, 'Toán')
  await page.reload()
  await sw.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Thời khóa biểu còn 1 tiết thứ Bảy. Cô muốn xóa các tiết này và tắt học thứ Bảy?')
  await dialog.getByRole('button', { name: 'Hủy' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(sw).toHaveAttribute('aria-checked', 'true')

  await sw.click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa và tắt' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  const { count } = await admin().from('timetable_slots').select('id', { count: 'exact', head: true }).eq('class_id', CLASS_ID).eq('weekday', 6)
  expect(count).toBe(0)
})

test('tải ảnh bìa thì /tong-quan hiện ảnh đó', async ({ page }) => {
  await open(page)
  await page.getByTestId('upload-cover').setInputFiles('tests/e2e/fixtures/avatar.png')
  await expect(saved(page)).toBeVisible()
  await page.goto('/tong-quan')
  await expect(page.getByTestId('hero-cover')).toBeVisible()
  const { data } = await admin().from('classes').select('cover_path').eq('id', CLASS_ID).single()
  expect(data?.cover_path).toMatch(new RegExp(`^${CLASS_ID}/branding/`))
})
