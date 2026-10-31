import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID, resetAnnouncements, resetGroups, resetStars, resetTimetable, seedSlot, seedStars, sid, sql } from './helpers/ledger'
import { weekdayInVietnam } from '../../lib/domain/date'

test.describe.configure({ mode: 'serial' })

async function reset() {
  resetStars()
  resetGroups()
  resetTimetable()
  await resetAnnouncements()
  sql(`update public.class_settings set feature_display = true, timetable_saturday = false where class_id = '${CLASS_ID}'`)
}
test.beforeEach(reset)
test.afterAll(reset)

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/trinh-chieu')
  await expect(page.getByRole('heading', { level: 1, name: /TRẠM KHÔNG GIAN NĂM 8/ })).toBeVisible()
}

async function names(nos: number[]) {
  const { data, error } = await admin().from('students').select('id, full_name').in('id', nos.map(sid))
  expect(error).toBeNull()
  return nos.map((n) => data!.find((s) => s.id === sid(n))!.full_name)
}

test('tiêu đề, ngày, năm học, Top 5, sao tuần, thành tích, thông báo ghim', async ({ page }) => {
  seedStars(3, 50)
  seedStars(5, 40)
  seedStars(1, 30)
  seedStars(2, 20)
  seedStars(8, 10)
  seedStars(9, 5)
  seedStars(6, 100, 30) // ngoài tuần, vẫn dẫn đầu cả năm
  // Một lần trừ có lý do riêng: không được xuất hiện.
  sql(`insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id)
       values ('${CLASS_ID}', '${sid(2)}', -1, 'penalty', 'Nói chuyện riêng', gen_random_uuid())`)
  sql(`insert into public.announcements (class_id, title, type, body, pinned) values
       ('${CLASS_ID}', 'Ôn tập Toán: hoàn thành trang 45', 'Nhắc bài', 'Nội dung', true),
       ('${CLASS_ID}', 'Thông báo không ghim', 'Thông báo chung', 'Nội dung', false)`)
  await open(page)

  await expect(page.getByText('Năm học 2026 – 2027')).toBeVisible()
  await expect(page.getByText(/^(Chủ Nhật|Thứ (Hai|Ba|Tư|Năm|Sáu|Bảy)), \d{2}\/\d{2}\/\d{4}$/)).toBeVisible()
  await expect(page.getByText('Lớp 5/8 · Cùng học – Cùng chơi – Cùng tỏa sáng')).toBeVisible()

  const [a6, a3, a5, a1, a2] = await names([6, 3, 5, 1, 2])
  const top = page.getByTestId('top5-row')
  await expect(top).toHaveCount(5)
  await expect(top.nth(0)).toContainText(a6)
  await expect(top.nth(0)).toContainText('100 sao')
  await expect(top.nth(1)).toContainText(a3)
  await expect(top.nth(2)).toContainText(a5)
  await expect(top.nth(3)).toContainText(a1)
  await expect(top.nth(4)).toContainText(a2)
  await expect(top.nth(4)).toContainText('19 sao')

  const week = page.getByTestId('week-row')
  await expect(week).toHaveCount(3)
  await expect(week.nth(0)).toHaveText(`+50${a3}`)
  await expect(week.nth(1)).toHaveText(`+40${a5}`)
  await expect(week.nth(2)).toHaveText(`+30${a1}`)

  // Tuần này: 50+40+30+19+10+5 = 154; Tổ 1 (HS01–03) = 99 dẫn đầu.
  await expect(page.getByText('Cả lớp đạt 154 sao thi đua trong tuần. Tổ 1 dẫn đầu.')).toBeVisible()
  await expect(page.getByText('Ôn tập Toán: hoàn thành trang 45')).toBeVisible()
  await expect(page.getByText('Thông báo không ghim')).toHaveCount(0)

  for (const banned of ['Điểm danh', 'Đăng xuất', 'co.khanh', 'Nói chuyện riêng', 'Cài đặt']) {
    await expect(page.locator('body')).not.toContainText(banned)
  }
})

test('Hôm nay học gì theo ngày Việt Nam, tôn trọng thứ Bảy', async ({ page }) => {
  const subjects = ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Thể dục', 'Khoa học', 'Đạo đức']
  subjects.forEach((s, i) => seedSlot(i + 1, 'morning', 1, s))
  seedSlot(1, 'afternoon', 2, 'Tin học')
  const wd = weekdayInVietnam()
  await open(page)
  const rows = page.getByTestId('today-row')
  if (wd === 0 || wd === 6) {
    await expect(page.getByText('Hôm nay không có tiết học.')).toBeVisible()
    await expect(rows).toHaveCount(0)
  } else {
    await expect(rows.first()).toContainText(`Tiết 1${subjects[wd - 1]}`)
  }
  if (wd === 6 || wd === 0) {
    sql(`update public.class_settings set timetable_saturday = true where class_id = '${CLASS_ID}'`)
    await page.reload()
    if (wd === 6) await expect(rows.first()).toContainText(`Tiết 1${subjects[5]}`)
    else await expect(rows).toHaveCount(0)
  }
})

test('thoát trình chiếu về tổng quan', async ({ page }) => {
  await open(page)
  await page.getByRole('link', { name: 'Thoát trình chiếu' }).click()
  await expect(page).toHaveURL(/\/tong-quan$/)
})

test('cờ feature_display tắt thì hiện thông báo', async ({ page }) => {
  await open(page)
  sql(`update public.class_settings set feature_display = false where class_id = '${CLASS_ID}'`)
  await page.reload()
  await expect(page.getByText('Tính năng này đang tắt. Cô bật lại trong Cài đặt.')).toBeVisible()
  await expect(page.getByTestId('top5-row')).toHaveCount(0)
})

test('tự động chuyển khối: mặc định tắt, bật thì khối thứ hai được tô sau 15 giây', async ({ page }) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.clock.install()
  await page.goto('/trinh-chieu')
  const toggle = page.getByRole('button', { name: 'Tự động chuyển khối' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('[data-active="true"]')).toHaveCount(0)
  await page.clock.fastForward(20_000)
  await expect(page.locator('[data-active="true"]')).toHaveCount(0)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-block="top5"]')).toHaveAttribute('data-active', 'true')
  await page.clock.fastForward(15_000)
  await expect(page.locator('[data-block="week"]')).toHaveAttribute('data-active', 'true')
  await expect(page.locator('[data-block="top5"]')).toHaveAttribute('data-active', 'false')
  await page.clock.fastForward(15_000)
  await expect(page.locator('[data-block="highlight"]')).toHaveAttribute('data-active', 'true')

  await toggle.click()
  await expect(page.locator('[data-active="true"]')).toHaveCount(0)
})

test('ảnh chụp màn hình bản desktop 1600x900', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.setViewportSize({ width: 1600, height: 900 })
  const mk = [3, 5, 1, 2, 8]
  mk.forEach((n, i) => seedStars(n, 60 - i * 8))
  seedStars(9, 7)
  const wd = weekdayInVietnam()
  const day = wd === 0 || wd === 6 ? 1 : wd
  ;['Tiếng Việt', 'Toán', 'Thể dục', 'Tiếng Anh', 'Toán'].forEach((s, i) => seedSlot(day, 'morning', i + 1, s))
  sql(`update public.class_settings set timetable_saturday = true where class_id = '${CLASS_ID}'`)
  sql(`insert into public.announcements (class_id, title, type, body, pinned) values
       ('${CLASS_ID}', 'Ôn tập Toán: hoàn thành trang 45 trước thứ Hai', 'Thông báo chung', 'x', true)`)
  await open(page)
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/display-desktop.png' })
})
