import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { admin, login, pw } from './helpers'
import {
  CLASS_ID,
  resetAnnouncements,
  resetAttendance,
  resetRewards,
  resetStars,
  resetTimetable,
  seedAttendance,
  seedSlot,
  seedStars,
  sid,
  sql,
} from './helpers/ledger'
import { weekdayInVietnam } from '../../lib/domain/date'

test.describe.configure({ mode: 'serial' })

const FLAGS = [
  'feature_rewards',
  'student_can_view_rewards',
  'student_can_view_timetable',
  'student_can_view_news',
  'student_can_view_attendance',
  'timetable_saturday',
  'require_approval',
  'reserve_on_request',
  'only_enough',
  'weekly_redeem_limit',
] as const

const SECRET = '00000000-0000-0000-0000-0000000e0005' // Quà bí mật, 50 sao
let original: Record<string, boolean | number> = {}

async function setSettings(values: Record<string, boolean | number>) {
  const { error } = await admin().from('class_settings').update(values).eq('class_id', CLASS_ID)
  expect(error).toBeNull()
}

async function reset() {
  resetStars()
  resetTimetable()
  resetAttendance()
  await resetRewards()
  await resetAnnouncements()
  await setSettings({ ...original, feature_rewards: true, student_can_view_rewards: true, student_can_view_timetable: true, student_can_view_news: true, student_can_view_attendance: true })
}

test.beforeAll(async () => {
  const { data, error } = await admin().from('class_settings').select(FLAGS.join(',')).eq('class_id', CLASS_ID).single()
  expect(error).toBeNull()
  original = data as unknown as Record<string, boolean | number>
})
test.beforeEach(reset)
test.afterAll(async () => {
  resetStars()
  resetTimetable()
  resetAttendance()
  await resetRewards()
  await resetAnnouncements()
  await setSettings(original)
})

async function open(page: Page, path: string) {
  await login(page, 'Học sinh', 'hs.hamy')
  await expect(page).toHaveURL(/\/em$/)
  await page.goto(path)
}

const gift = (page: Page, name: string) => page.getByTestId('gift').filter({ hasText: name })
const GIFTS = '/em/doi-qua'

test('Đổi quà: đủ sao thì gửi yêu cầu, hiện câu thành công và "Chờ cô duyệt"', async ({ page }, info) => {
  seedStars(5, 40)
  await open(page, GIFTS)
  await expect(page.getByRole('heading', { level: 1, name: 'Trạm đổi quà vũ trụ' })).toBeVisible()
  await expect(page.getByText('Em có 40 sao khả dụng')).toBeVisible()
  await expect(page.getByTestId('gift')).toHaveCount(5)
  if (info.project.name === 'desktop') await page.screenshot({ path: 'test-results/student-gifts-desktop.png', fullPage: true })

  await gift(page, 'Sticker vũ trụ').getByRole('button', { name: 'Đổi quà' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Xác nhận đổi quà' })
  await expect(dialog).toContainText('Em muốn đổi "Sticker vũ trụ" với 10 sao?')
  await dialog.getByRole('button', { name: 'Hủy' }).click()
  await expect(dialog).toHaveCount(0)

  await gift(page, 'Sticker vũ trụ').getByRole('button', { name: 'Đổi quà' }).click()
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã gửi yêu cầu đổi "Sticker vũ trụ". Hệ thống giữ 10 sao cho em, chờ cô duyệt.' })).toBeVisible()
  const mine = page.getByTestId('my-request')
  await expect(mine).toHaveCount(1)
  await expect(mine).toContainText('Sticker vũ trụ')
  await expect(mine).toContainText('10 sao')
  await expect(mine).toContainText('Chờ cô duyệt')
  await expect(page.getByText('Em có 30 sao khả dụng')).toBeVisible()
})

test('Đổi quà: tắt giữ sao thì câu thành công bỏ vế giữ sao', async ({ page }) => {
  await setSettings({ reserve_on_request: false })
  seedStars(5, 40)
  await open(page, GIFTS)
  await gift(page, 'Sticker vũ trụ').getByRole('button', { name: 'Đổi quà' }).click()
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã gửi yêu cầu đổi "Sticker vũ trụ", chờ cô duyệt.' })).toBeVisible()
  await expect(page.getByText('Em có 40 sao khả dụng')).toBeVisible()
})

test('Đổi quà: không đủ sao thì nút "Chưa đủ sao (thiếu n)" bị khóa', async ({ page }) => {
  seedStars(5, 5)
  await open(page, GIFTS)
  const bookmark = gift(page, 'Bookmark tên lửa').getByRole('button')
  await expect(bookmark).toHaveText('Chưa đủ sao (thiếu 10)')
  await expect(bookmark).toBeDisabled()
  await expect(gift(page, 'Sticker vũ trụ').getByRole('button')).toHaveText('Chưa đủ sao (thiếu 5)')
})

test('Đổi quà: bạn khác giữ món cuối thì Hà My thấy "Hết quà"', async ({ page }) => {
  seedStars(5, 60)
  sql(`update public.rewards set stock = 1 where id = '${SECRET}'`)
  await open(page, GIFTS)
  await expect(gift(page, 'Quà bí mật').getByRole('button')).toHaveText('Đổi quà')
  sql(`insert into public.reward_requests (class_id, student_id, reward_id, cost) values ('${CLASS_ID}', '${sid(1)}', '${SECRET}', 50)`)
  await page.reload()
  const secret = gift(page, 'Quà bí mật').getByRole('button')
  await expect(secret).toHaveText('Hết quà')
  await expect(secret).toBeDisabled()
  await expect(page.getByTestId('my-request')).toHaveCount(0)
})

test('Đổi quà: bạn khác lấy món cuối sau khi trang tải thì hiện câu out_of_stock, không lỗi trang', async ({ page }) => {
  seedStars(5, 60)
  sql(`update public.rewards set stock = 1 where id = '${SECRET}'`)
  await open(page, GIFTS)
  await gift(page, 'Quà bí mật').getByRole('button', { name: 'Đổi quà' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  sql(`insert into public.reward_requests (class_id, student_id, reward_id, cost) values ('${CLASS_ID}', '${sid(1)}', '${SECRET}', 50)`)
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Quà này đã hết.' })).toBeVisible()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: 'Trạm đổi quà vũ trụ' })).toBeVisible()
  await expect(gift(page, 'Quà bí mật').getByRole('button')).toHaveText('Hết quà')
  await expect(page.getByTestId('my-request')).toHaveCount(0)
})

test('Đổi quà: cờ đổi quà tắt thì /em/doi-qua trả 404', async ({ page }) => {
  await setSettings({ feature_rewards: false })
  await open(page, '/em')
  const res = await page.goto(GIFTS)
  expect(res?.status()).toBe(404)
})

test('Thời khóa biểu: hiện môn đã gán, cột hôm nay tô #4F5BD5, thứ Bảy theo cờ', async ({ page }) => {
  seedSlot(1, 'morning', 1, 'Toán')
  seedSlot(2, 'afternoon', 2, 'Tin học')
  await open(page, '/em/thoi-khoa-bieu')
  await expect(page.getByRole('heading', { level: 1, name: 'Lịch bay của phi hành gia' })).toBeVisible()
  const table = page.getByRole('table', { name: 'Thời khóa biểu' })
  await expect(table.getByRole('cell', { name: 'Toán', exact: true })).toHaveCount(1)
  await expect(table.getByRole('cell', { name: 'Tin học', exact: true })).toHaveCount(1)
  await expect(table.getByRole('cell', { name: 'Toán', exact: true })).toHaveCSS('color', 'rgb(44, 55, 168)')
  await expect(table.getByRole('columnheader')).toHaveCount(5)
  await expect(table.getByRole('columnheader', { name: 'Thứ Bảy' })).toHaveCount(0)
  await expect(table.locator('input, button, select')).toHaveCount(0)

  const wd = weekdayInVietnam()
  const today = table.locator('[data-today="true"]')
  if (wd >= 1 && wd <= 5) {
    await expect(today).toHaveCount(1)
    await expect(today).toHaveCSS('background-color', 'rgb(79, 91, 213)')
  } else {
    await expect(today).toHaveCount(0)
  }

  await setSettings({ timetable_saturday: true })
  await page.reload()
  await expect(table.getByRole('columnheader')).toHaveCount(6)
  await expect(table.getByRole('columnheader', { name: 'Thứ Bảy' })).toBeVisible()
})

test('Điểm danh: 4 ô đúng theo quy tắc attended, danh sách ngày gần nhất', async ({ page }) => {
  seedAttendance(5, 'present', 1)
  seedAttendance(5, 'present', 2)
  seedAttendance(5, 'late', 3)
  seedAttendance(5, 'absent_excused', 4)
  seedAttendance(5, 'absent_unexcused', 5)
  seedAttendance(1, 'absent_unexcused', 1) // bạn khác không được tính
  await open(page, '/em/diem-danh')
  await expect(page.getByRole('heading', { level: 1, name: 'Điểm danh của em' })).toBeVisible()
  const stats = page.getByTestId('att-stat')
  await expect(stats).toHaveCount(4)
  await expect(stats.nth(0)).toContainText('Tỉ lệ chuyên cần')
  await expect(stats.nth(0)).toContainText('60%')
  await expect(stats.nth(1)).toContainText('Số buổi vắng')
  await expect(stats.nth(1)).toContainText('1')
  await expect(stats.nth(2)).toContainText('Số buổi đi trễ')
  await expect(stats.nth(2)).toContainText('1')
  await expect(stats.nth(3)).toContainText('Vắng có phép')
  await expect(stats.nth(3)).toContainText('1')
  await expect(page.getByText('Trang này chỉ hiện khi cô giáo bật quyền xem.')).toBeVisible()
  const days = page.getByTestId('att-day')
  await expect(days).toHaveCount(5)
  await expect(days.nth(0)).toContainText('Có mặt')
  await expect(days.nth(2)).toContainText('Đi trễ')
  await expect(days.nth(3)).toContainText('Vắng có phép')
  await expect(days.nth(4)).toContainText('Vắng không phép')
})

test('Điểm danh: tắt student_can_view_attendance thì 404', async ({ page }) => {
  await setSettings({ student_can_view_attendance: false })
  await open(page, '/em')
  const res = await page.goto('/em/diem-danh')
  expect(res?.status()).toBe(404)
})

test('Thông báo: ghim trước, màu theo loại, ảnh; thông báo đã xóa không hiện và ảnh của nó không ký được', async ({ page }) => {
  const png = readFileSync('tests/e2e/fixtures/avatar.png')
  const store = admin().storage.from('class-media')
  const livePath = `${CLASS_ID}/announcements/live.png`
  const deadPath = `${CLASS_ID}/announcements/dead.png`
  for (const p of [livePath, deadPath]) {
    const { error } = await store.upload(p, png, { contentType: 'image/png', upsert: true })
    expect(error).toBeNull()
  }
  sql(`insert into public.announcements (class_id, title, type, body, pinned, published_at, image_path) values
    ('${CLASS_ID}', 'Tin thường', 'Hoạt động', 'Nội dung thường', false, now(), '${livePath}'),
    ('${CLASS_ID}', 'Tin ghim', 'Lịch kiểm tra', 'Nội dung ghim', true, now() - interval '2 days', null)`)
  sql(`insert into public.announcements (class_id, title, type, body, published_at, archived_at, image_path)
    values ('${CLASS_ID}', 'Tin đã xóa', 'Nhắc bài', 'x', now(), now(), '${deadPath}')`)

  await open(page, '/em/thong-bao')
  await expect(page.getByRole('heading', { level: 1, name: 'Tín hiệu từ trạm chỉ huy' })).toBeVisible()
  const cards = page.getByTestId('news-card')
  await expect(cards).toHaveCount(2)
  await expect(cards.nth(0)).toContainText('Tin ghim')
  await expect(cards.nth(0)).toContainText('Đang ghim')
  await expect(cards.nth(1)).toContainText('Tin thường')
  await expect(cards.nth(0).getByText('Lịch kiểm tra', { exact: true })).toHaveCSS('background-color', 'rgb(255, 227, 238)')
  await expect(cards.nth(1).getByText('Hoạt động', { exact: true })).toHaveCSS('background-color', 'rgb(221, 246, 241)')
  await expect(page.getByText('Tin đã xóa')).toHaveCount(0)
  await expect(cards.nth(1).locator('img')).toBeVisible()
  await expect(cards.nth(0).locator('img')).toHaveCount(0)

  // Học sinh không ký được URL của ảnh thuộc thông báo đã xóa.
  const student = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: signInError } = await student.auth.signInWithPassword({
    email: `hs.hamy@${process.env.AUTH_EMAIL_DOMAIN ?? 'tram58.local'}`,
    password: pw('hs.hamy'),
  })
  expect(signInError).toBeNull()
  const dead = await student.storage.from('class-media').createSignedUrl(deadPath, 60)
  expect(dead.data).toBeNull()
  expect(dead.error).not.toBeNull()
  const live = await student.storage.from('class-media').createSignedUrl(livePath, 60)
  expect(live.error).toBeNull()
})

test('Thông báo: cờ tin tắt thì 404', async ({ page }) => {
  await setSettings({ student_can_view_news: false })
  await open(page, '/em')
  const res = await page.goto('/em/thong-bao')
  expect(res?.status()).toBe(404)
})
