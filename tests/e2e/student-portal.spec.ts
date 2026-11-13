import { expect, test, type Page } from '@playwright/test'
import { admin, login, pw } from './helpers'
import {
  CLASS_ID,
  resetAnnouncements,
  resetMissions,
  resetStars,
  resetTimetable,
  seedDelta,
  seedSlot,
  seedStars,
  sid,
  sql,
} from './helpers/ledger'
import { weekdayInVietnam } from '../../lib/domain/date'

test.describe.configure({ mode: 'serial' })

const FLAGS = [
  'feature_missions',
  'feature_rewards',
  'student_can_view_history',
  'student_can_view_rank',
  'student_can_view_rewards',
  'student_can_view_timetable',
  'student_can_view_news',
  'student_can_view_attendance',
  'student_can_change_avatar',
] as const

let original: Record<string, boolean> = {}
let originalAvatar: string | null = null

async function setFlags(values: Partial<Record<(typeof FLAGS)[number], boolean>>) {
  const { error } = await admin().from('class_settings').update(values).eq('class_id', CLASS_ID)
  expect(error).toBeNull()
}

async function reset() {
  resetStars()
  resetMissions()
  resetTimetable()
  await resetAnnouncements()
  sql(`delete from public.student_badges where class_id = '${CLASS_ID}'`)
  await setFlags({ ...original, student_can_view_attendance: true, feature_rewards: true })
}

test.beforeAll(async () => {
  const { data, error } = await admin().from('class_settings').select(FLAGS.join(',')).eq('class_id', CLASS_ID).single()
  expect(error).toBeNull()
  original = data as unknown as Record<string, boolean>
  const { data: s } = await admin().from('students').select('avatar_id').eq('id', sid(5)).single()
  originalAvatar = s?.avatar_id ?? null
})
test.beforeEach(reset)

/** Trả mật khẩu của tài khoản seed về như cũ để các spec khác còn đăng nhập được. */
async function restorePassword() {
  const db = admin()
  const { data, error } = await db.from('profiles').select('id').eq('username', 'hs.hamy').single()
  expect(error).toBeNull()
  const res = await db.auth.admin.updateUserById(data!.id, { password: pw('hs.hamy') })
  expect(res.error).toBeNull()
}

test.afterAll(async () => {
  await restorePassword()
  resetStars()
  resetMissions()
  resetTimetable()
  await resetAnnouncements()
  sql(`delete from public.student_badges where class_id = '${CLASS_ID}'`)
  await setFlags(original)
  await admin().from('students').update({ avatar_id: originalAvatar }).eq('id', sid(5))
})

async function open(page: Page, path = '/em') {
  await login(page, 'Học sinh', 'hs.hamy')
  await expect(page).toHaveURL(/\/em$/)
  if (path !== '/em') await page.goto(path)
}

const menu = (page: Page) => page.getByRole('navigation', { name: 'Menu học sinh' })

// Dưới lg menu là thanh tab đáy: 4 mục đầu + "Thêm" mở bảng chứa các mục còn lại (khi có hơn 5 mục).
async function showAllLinks(page: Page) {
  const more = menu(page).getByRole('button', { name: 'Thêm' })
  if (await more.isVisible()) await more.click()
}

test('menu 8 mục theo thứ tự khi bật hết', async ({ page }) => {
  await open(page)
  await showAllLinks(page)
  await expect(menu(page).getByRole('link')).toHaveText([
    'Trang chủ',
    'Sao của em',
    'Bảng xếp hạng',
    'Đổi quà',
    'Thời khóa biểu',
    'Điểm danh của em',
    'Thông báo',
    'Kho học liệu',
  ])
  await expect(menu(page).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page')
})

test('dưới lg menu là thanh tab đáy, trên lg là thanh bên', async ({ page }) => {
  await open(page)
  const width = page.viewportSize()!.width
  const pos = await menu(page).evaluate((el) => getComputedStyle(el).position)
  if (width < 1024) {
    expect(pos).toBe('fixed')
    await expect(menu(page).getByRole('button', { name: 'Thêm' })).toBeVisible()
  } else {
    expect(pos).not.toBe('fixed')
    await expect(menu(page).getByRole('button', { name: 'Thêm' })).toBeHidden()
  }
})

test('cô tắt bảng xếp hạng: mục biến mất và /em/xep-hang trả 404', async ({ page }) => {
  await open(page)
  await expect(menu(page).getByRole('link', { name: 'Bảng xếp hạng' })).toBeVisible()
  await setFlags({ student_can_view_rank: false })
  await page.reload()
  await showAllLinks(page)
  await expect(menu(page).getByRole('link', { name: 'Bảng xếp hạng' })).toHaveCount(0)
  await expect(menu(page).getByRole('link')).toHaveCount(7)
  const res = await page.goto('/em/xep-hang')
  expect(res?.status()).toBe(404)
})

test('Trang chủ: lời chào, sao khả dụng, ba ô số, thứ hạng', async ({ page }) => {
  seedStars(5, 40)
  seedDelta(5, -5)
  seedStars(1, 10)
  await open(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Xin chào, Hà My!' })).toBeVisible()
  await expect(page.getByText('Hôm nay em còn 35 sao khả dụng. Cố gắng thêm nhé, phi hành gia nhí!')).toBeVisible()
  const stats = page.getByTestId('stat')
  await expect(stats).toHaveCount(3)
  await expect(stats.nth(0)).toContainText('Sao thi đua tích lũy')
  await expect(stats.nth(0)).toContainText('35')
  await expect(stats.nth(1)).toContainText('Sao khả dụng')
  await expect(stats.nth(2)).toContainText('#1')
  await expect(stats.nth(2)).toContainText('trong 10 bạn')
})

test('Hôm nay học gì: chỉ tiết sáng; ngày nghỉ hiện câu nghỉ', async ({ page }) => {
  const wd = weekdayInVietnam()
  const school = wd >= 1 && wd <= 5
  if (school) {
    seedSlot(wd, 'morning', 1, 'Toán')
    seedSlot(wd, 'afternoon', 1, 'Tin học')
  }
  await open(page)
  if (school) {
    await expect(page.getByTestId('lesson')).toHaveCount(1)
    await expect(page.getByTestId('lesson')).toContainText('Tiết 1')
    await expect(page.getByTestId('lesson')).toContainText('Toán')
    await expect(page.getByText('Tin học')).toHaveCount(0)
  } else {
    await expect(page.getByText('Hôm nay em được nghỉ.')).toBeVisible()
  }
})

test('Tín hiệu mới: tối đa 3 thông báo; cờ tin tắt thì ẩn khối', async ({ page }) => {
  sql(`insert into public.announcements (class_id, title, type, body, published_at) values
    ('${CLASS_ID}', 'Tin một', 'Nhắc bài', 'x', now()),
    ('${CLASS_ID}', 'Tin hai', 'Hoạt động', 'x', now() - interval '1 minute'),
    ('${CLASS_ID}', 'Tin ba', 'Lịch kiểm tra', 'x', now() - interval '2 minutes'),
    ('${CLASS_ID}', 'Tin bốn', 'Nhắc bài', 'x', now() - interval '3 minutes')`)
  await open(page)
  await expect(page.getByRole('heading', { name: 'Tín hiệu mới' })).toBeVisible()
  await expect(page.getByTestId('home-news')).toHaveCount(3)
  await expect(page.getByText('Tin bốn')).toHaveCount(0)
  await setFlags({ student_can_view_news: false })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tín hiệu mới' })).toHaveCount(0)
})

test('Sao của em: có "Trừ sao", không bao giờ lộ ghi chú trừ sao', async ({ page }) => {
  seedStars(5, 3)
  sql(`insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id)
       values ('${CLASS_ID}', '${sid(5)}', -1, 'penalty', 'Nói chuyện riêng', gen_random_uuid())`)
  await open(page)
  await page.getByRole('link', { name: 'Sao của em' }).click()
  await expect(page).toHaveURL(/\/em\/sao$/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Sao của em' })).toBeVisible()
  await expect(page.getByText('Em chỉ thấy lịch sử của riêng mình, không thấy của bạn khác.')).toBeVisible()
  const rows = page.getByTestId('history-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.filter({ hasText: 'Trừ sao' })).toContainText('-1')
  expect(await page.content()).not.toContain('Nói chuyện riêng')
  // API cũng không trả ghi chú.
  expect(await page.locator('body').innerText()).not.toContain('Nói chuyện')
})

test('Huy hiệu: đã đạt bình thường, chưa đạt mờ kèm "(chưa đạt)", cờ nhiệm vụ tắt thì ẩn', async ({ page }) => {
  sql(`insert into public.student_badges (class_id, badge_id, student_id)
       values ('${CLASS_ID}', '00000000-0000-0000-0000-0000000f0004', '${sid(5)}')`)
  await open(page, '/em/sao')
  await expect(page.getByRole('heading', { name: 'Huy hiệu của em' })).toBeVisible()
  const badges = page.getByTestId('badge')
  await expect(badges).toHaveCount(5)
  await expect(page.locator('[data-earned="true"]')).toHaveCount(1)
  await expect(page.locator('[data-earned="true"]')).toHaveText('Người bạn tốt')
  await expect(page.locator('[data-earned="false"]')).toHaveCount(4)
  await expect(page.locator('[data-earned="false"]').first()).toContainText('(chưa đạt)')
  await setFlags({ feature_missions: false })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Huy hiệu của em' })).toHaveCount(0)
})

test('Bảng xếp hạng: Top 5, dòng của em tô màu và "(em)"', async ({ page }) => {
  seedStars(5, 50)
  seedStars(1, 40)
  await open(page, '/em/xep-hang')
  await expect(page.getByRole('heading', { name: 'Top 5 ngôi sao sáng nhất · cả năm' })).toBeVisible()
  const rows = page.getByTestId('rank-row')
  await expect(rows).toHaveCount(5)
  const me = rows.filter({ hasText: '(em)' })
  await expect(me).toHaveCount(1)
  await expect(me).toContainText('Võ Hà My')
  await expect(me).toContainText('50 sao')
  await expect(me).toHaveCSS('background-color', 'rgb(224, 238, 255)')
  await expect(me).toHaveCSS('border-top-color', 'rgb(37, 99, 235)')
})

test('Bảng xếp hạng: em ngoài Top 5 thì thêm dòng của em ở cuối', async ({ page }) => {
  for (const n of [1, 2, 3, 4, 6, 7]) seedStars(n, 10 + n)
  seedStars(5, 1)
  await open(page, '/em/xep-hang')
  const rows = page.getByTestId('rank-row')
  await expect(rows).toHaveCount(6)
  await expect(rows.last()).toContainText('(em)')
  await expect(rows.last()).toContainText('1 sao')
  await expect(page.getByText('(em)')).toHaveCount(1)
})

test('đổi avatar khi cờ bật; không có nút khi cờ tắt', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Đổi avatar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Chọn avatar của em' })
  await expect(dialog).toBeVisible()
  const options = dialog.getByRole('radio')
  expect(await options.count()).toBeGreaterThan(1)
  const { data: before } = await admin().from('students').select('avatar_id').eq('id', sid(5)).single()
  const target = (await options.evaluateAll((els) => els.map((e) => e.getAttribute('aria-checked'))))
    .findIndex((c) => c !== 'true')
  await options.nth(target).click()
  await dialog.getByRole('button', { name: 'Lưu avatar' }).click()
  await expect(dialog).toHaveCount(0)
  await expect
    .poll(async () => (await admin().from('students').select('avatar_id').eq('id', sid(5)).single()).data?.avatar_id)
    .not.toBe(before?.avatar_id)

  await setFlags({ student_can_change_avatar: false })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Đổi avatar' })).toHaveCount(0)
})

async function studentLogin(page: Page, password: string) {
  await page.context().clearCookies()
  await page.goto('/dang-nhap')
  await page.getByRole('tab', { name: 'Học sinh' }).click()
  await page.getByLabel(/Tên đăng nhập/).fill('hs.hamy')
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Cất cánh' }).click()
}

test('em đổi mật khẩu: mật khẩu cũ hết dùng, mật khẩu mới đăng nhập được', async ({ page }) => {
  const next = 'em-doi-mk-7'
  try {
    await open(page)
    await page.getByRole('button', { name: 'Đổi mật khẩu' }).click()
    const dialog = page.getByRole('dialog', { name: 'Đổi mật khẩu' })
    await dialog.getByLabel('Mật khẩu mới', { exact: true }).fill(next)
    await dialog.getByLabel('Nhập lại mật khẩu mới').fill(next)
    await dialog.getByRole('button', { name: 'Lưu' }).click()
    await expect(dialog.getByText('Đã đổi mật khẩu. Lần sau em đăng nhập bằng mật khẩu mới nhé.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Đóng' }).click()
    await expect(dialog).toBeHidden()

    await studentLogin(page, pw('hs.hamy'))
    await expect(page.getByText('Tên đăng nhập hoặc mật khẩu chưa đúng.')).toBeVisible()
    await studentLogin(page, next)
    await expect(page).toHaveURL(/\/em$/)
  } finally {
    await restorePassword()
  }
})

test('em đổi mật khẩu: hai ô không khớp hoặc dưới 6 ký tự thì báo lỗi, mật khẩu cũ giữ nguyên', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Đổi mật khẩu' }).click()
  const dialog = page.getByRole('dialog', { name: 'Đổi mật khẩu' })

  await dialog.getByLabel('Mật khẩu mới', { exact: true }).fill('abcdef')
  await dialog.getByLabel('Nhập lại mật khẩu mới').fill('abcdeg')
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(dialog.getByText('Hai ô mật khẩu chưa giống nhau.')).toBeVisible()

  await dialog.getByLabel('Mật khẩu mới', { exact: true }).fill('abc12')
  await dialog.getByLabel('Nhập lại mật khẩu mới').fill('abc12')
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(dialog.getByText('Mật khẩu cần ít nhất 6 ký tự.')).toBeVisible()

  await dialog.getByRole('button', { name: 'Hủy' }).click()
  await expect(dialog).toBeHidden()
  await studentLogin(page, pw('hs.hamy'))
  await expect(page).toHaveURL(/\/em$/)
})

test('Đăng xuất về /dang-nhap', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/dang-nhap/)
})

test('học sinh mở /tong-quan thì về /em', async ({ page }) => {
  await open(page)
  await page.goto('/tong-quan')
  await expect(page).toHaveURL(/\/em$/)
})

test('giáo viên xem thử /em thấy dữ liệu học sinh đầu tiên', async ({ page }) => {
  seedStars(1, 7)
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/em')
  await expect(page.getByText('Đây là bản xem thử giao diện học sinh.')).toBeVisible()
  await expect(page.getByText('Hôm nay em còn 7 sao khả dụng.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Đổi avatar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Đổi mật khẩu' })).toHaveCount(0)
})
