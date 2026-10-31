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
  await expect(card(page, 'Ôn tập Toán').getByRole('button', { name: 'Bấm lần nữa để xóa' })).toBeVisible()
  await card(page, 'Ôn tập Toán').getByRole('button', { name: 'Bấm lần nữa để xóa' }).click()
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
  await card(page, 'Thông báo sẽ xóa').getByRole('button', { name: 'Bấm lần nữa để xóa' }).click()
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
