import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID, resetAnnouncements } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

test.beforeEach(resetAnnouncements)
test.afterAll(resetAnnouncements)

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/thong-bao')
  await expect(page.getByRole('heading', { level: 1, name: 'Tín hiệu từ trạm chỉ huy' })).toBeVisible()
}

const cards = (page: Page) => page.getByTestId('announcement-card')
const card = (page: Page, title: string) => cards(page).filter({ hasText: title })
const status = (page: Page, text: string) => page.getByRole('status').filter({ hasText: text })

async function post(page: Page, title: string, body: string, type?: string, pin = false) {
  await page.getByLabel('Tiêu đề').fill(title)
  await page.getByLabel('Nội dung').fill(body)
  if (type) await page.getByLabel('Loại').selectOption(type)
  if (pin) await page.getByRole('switch', { name: 'Ghim lên đầu' }).click()
  await page.getByRole('button', { name: 'Đăng thông báo' }).click()
}

test('đăng, ghim, sửa, bỏ ghim, xóa hai bước', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Đăng thông báo mới' })).toBeVisible()

  await page.getByRole('button', { name: 'Đăng thông báo' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Cô hãy nhập tiêu đề và nội dung.' })).toBeVisible()
  await expect(cards(page)).toHaveCount(0)

  await post(page, 'Kiểm tra giữa kỳ', 'Mang theo bút.', 'Lịch kiểm tra')
  await expect(status(page, 'Đã đăng thông báo. Học sinh sẽ thấy ở trang Thông báo.')).toBeVisible()
  await expect(cards(page)).toHaveCount(1)

  await post(page, 'Ôn tập Toán', 'Làm trang 45.', 'Nhắc bài', true)
  await expect(cards(page)).toHaveCount(2)
  const first = cards(page).first()
  await expect(first).toContainText('Ôn tập Toán')
  await expect(first).toContainText('Đang ghim')
  await expect(first).toContainText('Nhắc bài')
  await expect(first).toContainText('Hôm nay')
  await expect(page.getByLabel('Tiêu đề')).toHaveValue('')

  await first.getByRole('button', { name: 'Sửa' }).click()
  await expect(page.getByRole('heading', { name: 'Sửa thông báo' })).toBeVisible()
  await expect(page.getByLabel('Tiêu đề')).toHaveValue('Ôn tập Toán')
  await expect(page.getByRole('button', { name: 'Hủy sửa' })).toBeVisible()
  await page.getByLabel('Nội dung').fill('Làm trang 46.')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(status(page, 'Đã lưu thay đổi. Học sinh thấy nội dung mới.')).toBeVisible()
  await expect(card(page, 'Ôn tập Toán')).toContainText('Làm trang 46.')
  await expect(page.getByRole('heading', { name: 'Đăng thông báo mới' })).toBeVisible()

  await card(page, 'Ôn tập Toán').getByRole('button', { name: 'Sửa' }).click()
  await page.getByRole('button', { name: 'Hủy sửa' }).click()
  await expect(page.getByRole('heading', { name: 'Đăng thông báo mới' })).toBeVisible()

  await card(page, 'Ôn tập Toán').getByRole('button', { name: 'Bỏ ghim' }).click()
  await expect(card(page, 'Ôn tập Toán')).not.toContainText('Đang ghim')
  await expect(card(page, 'Ôn tập Toán').getByRole('button', { name: 'Ghim' })).toBeVisible()

  const del = card(page, 'Ôn tập Toán').getByRole('button', { name: 'Xóa' })
  await del.click()
  await expect(page.getByRole('dialog', { name: 'Xóa thông báo này?' })).toBeVisible()
  await page.getByRole('dialog', { name: 'Xóa thông báo này?' }).getByRole('button', { name: 'Xóa thông báo' }).click()
  await expect(status(page, 'Đã xóa thông báo.')).toBeVisible()
  await expect(card(page, 'Ôn tập Toán')).toHaveCount(0)
  await expect(cards(page)).toHaveCount(1)

  const { data } = await admin().from('announcements').select('title, archived_at').eq('class_id', CLASS_ID).eq('title', 'Ôn tập Toán')
  expect(data).toHaveLength(1)
  expect(data![0].archived_at).not.toBeNull()
})

test('đính kèm hình ảnh thì thẻ hiện ảnh', async ({ page }) => {
  await open(page)
  await page.locator('input[type=file]').setInputFiles('tests/e2e/fixtures/avatar.png')
  await page.getByLabel('Tiêu đề').fill('Ngày hội đọc sách')
  await page.getByLabel('Nội dung').fill('Mang sách yêu thích.')
  await page.getByRole('button', { name: 'Đăng thông báo' }).click()
  await expect(status(page, 'Đã đăng thông báo.')).toBeVisible()
  await expect(card(page, 'Ngày hội đọc sách').locator('img')).toBeVisible()
  const { data } = await admin().from('announcements').select('image_path').eq('title', 'Ngày hội đọc sách').single()
  expect(data?.image_path).toMatch(new RegExp(`^${CLASS_ID}/announcements/.+\\.(png|jpg|webp)$`))
})

test('Tổng quan hiện thông báo ghim, không hiện thông báo đã xóa', async ({ page }, info) => {
  await open(page)
  await post(page, 'Ôn tập Toán', 'Làm trang 45.', 'Nhắc bài', true)
  await expect(cards(page)).toHaveCount(1)
  await post(page, 'Kiểm tra Tiếng Việt', 'Mang bút mực.', 'Lịch kiểm tra')
  await expect(cards(page)).toHaveCount(2)
  await post(page, 'Ngày hội đọc', 'Mang sách.', 'Hoạt động')
  await expect(cards(page)).toHaveCount(3)
  await post(page, 'Thông báo sẽ xóa', 'Nội dung tạm.')
  await expect(cards(page)).toHaveCount(4)
  await card(page, 'Thông báo sẽ xóa').getByRole('button', { name: 'Xóa' }).click()
  await page.getByRole('dialog', { name: 'Xóa thông báo này?' }).getByRole('button', { name: 'Xóa thông báo' }).click()
  await expect(card(page, 'Thông báo sẽ xóa')).toHaveCount(0)

  if (info.project.name === 'desktop') {
    await page.screenshot({ path: 'test-results/announcements-desktop.png', fullPage: true })
  }

  await page.goto('/tong-quan')
  const news = page.getByTestId('news')
  await expect(news).toContainText('Ôn tập Toán')
  await expect(news).not.toContainText('Thông báo sẽ xóa')
  await expect(news.getByRole('heading', { name: 'Tín hiệu từ trạm chỉ huy' })).toBeVisible()
})

test('sửa thông báo: thay hình mới thì hình cũ bị xóa khỏi kho', async ({ page }) => {
  await open(page)
  await page.locator('input[type=file]').setInputFiles('tests/e2e/fixtures/avatar.png')
  await post(page, 'Có hình', 'Nội dung.')
  await expect(status(page, 'Đã đăng thông báo.')).toBeVisible()
  const first = await admin().from('announcements').select('image_path').eq('title', 'Có hình').single()
  const oldPath = first.data?.image_path as string
  expect(oldPath).toBeTruthy()

  await card(page, 'Có hình').getByRole('button', { name: 'Sửa' }).click()
  await page.locator('input[type=file]').setInputFiles('tests/e2e/fixtures/avatar.png')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(status(page, 'Đã lưu thay đổi.')).toBeVisible()
  await expect(card(page, 'Có hình').locator('img')).toBeVisible()

  await expect
    .poll(async () => (await admin().from('announcements').select('image_path').eq('title', 'Có hình').single()).data?.image_path)
    .not.toBe(oldPath)
  const next = await admin().from('announcements').select('image_path').eq('title', 'Có hình').single()
  expect(next.data?.image_path).toMatch(new RegExp(`^${CLASS_ID}/announcements/.+\\.(png|jpg|webp)$`))
  const { data: files } = await admin().storage.from('class-media').list(`${CLASS_ID}/announcements`)
  expect(files?.map((f) => `${CLASS_ID}/announcements/${f.name}`)).toEqual([next.data?.image_path])
})

test('sửa thông báo: "Bỏ hình" gỡ ảnh khỏi thông báo và kho', async ({ page }) => {
  await open(page)
  await page.locator('input[type=file]').setInputFiles('tests/e2e/fixtures/avatar.png')
  await post(page, 'Bỏ hình thử', 'Nội dung.')
  await expect(status(page, 'Đã đăng thông báo.')).toBeVisible()
  await expect(card(page, 'Bỏ hình thử').locator('img')).toBeVisible()

  await card(page, 'Bỏ hình thử').getByRole('button', { name: 'Sửa' }).click()
  await page.getByRole('button', { name: 'Bỏ hình' }).click()
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(status(page, 'Đã lưu thay đổi.')).toBeVisible()
  await expect(card(page, 'Bỏ hình thử').locator('img')).toHaveCount(0)

  const { data } = await admin().from('announcements').select('image_path').eq('title', 'Bỏ hình thử').single()
  expect(data?.image_path).toBeNull()
  await expect
    .poll(async () => (await admin().storage.from('class-media').list(`${CLASS_ID}/announcements`)).data?.length)
    .toBe(0)
})

test('sửa thông báo đã bị xóa ở nơi khác thì báo announcement_not_found', async ({ page }) => {
  await open(page)
  await post(page, 'Sẽ biến mất', 'Nội dung.')
  await expect(status(page, 'Đã đăng thông báo.')).toBeVisible()
  await card(page, 'Sẽ biến mất').getByRole('button', { name: 'Sửa' }).click()
  const { error } = await admin()
    .from('announcements')
    .update({ archived_at: new Date().toISOString() })
    .eq('class_id', CLASS_ID)
    .eq('title', 'Sẽ biến mất')
  expect(error).toBeNull()
  await page.getByLabel('Nội dung').fill('Nội dung mới.')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Thông báo này không còn nữa.' })).toBeVisible()
})
