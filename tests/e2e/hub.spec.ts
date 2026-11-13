import { expect, test, type Page } from '@playwright/test'
import { login } from './helpers'

// Chỉ kiểm thuộc tính của khung nhúng, không tải nội dung từ web ngoài (tránh phụ thuộc mạng).
const HUB_URL = 'https://studywithbong.netlify.app/#/khoi/5'

async function expectFrame(page: Page) {
  await expect(page.getByRole('heading', { level: 1, name: 'Kho học liệu' })).toBeVisible()
  await expect(page.locator('iframe[title="Kho học liệu"]')).toHaveAttribute('src', HUB_URL)
  const link = page.getByRole('link', { name: 'Mở trong tab mới' })
  await expect(link).toHaveAttribute('href', HUB_URL)
  await expect(link).toHaveAttribute('target', '_blank')
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(fits).toBe(true)
}

test('cô: /kho-hoc-lieu có khung nhúng, nút tab mới, không tràn ngang', async ({ page }) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/kho-hoc-lieu')
  await expectFrame(page)
})

test('học sinh: mở Kho học liệu từ menu, khung không bị thanh tab đáy che', async ({ page }) => {
  await login(page, 'Học sinh', 'hs.hamy')
  await expect(page).toHaveURL(/\/em$/)
  const menu = page.getByRole('navigation', { name: 'Menu học sinh' })
  const more = menu.getByRole('button', { name: 'Thêm' })
  if (await more.isVisible()) await more.click()
  await Promise.all([page.waitForURL('**/em/kho-hoc-lieu'), menu.getByRole('link', { name: 'Kho học liệu' }).click()])
  await expectFrame(page)
  if (page.viewportSize()!.width < 1024) {
    // Cả khung phải nằm gọn trong vùng nhìn thấy phía trên thanh tab đáy (cuộn khung vào đầu màn hình rồi đo).
    const fit = await page.evaluate(() => {
      const el = document.querySelector('iframe[title="Kho học liệu"]')!
      el.scrollIntoView({ block: 'start' })
      const frame = el.getBoundingClientRect()
      const bar = document.querySelector('nav[aria-label="Menu học sinh"]')!.getBoundingClientRect()
      return { frameHeight: frame.height, barTop: bar.top }
    })
    expect(fit.frameHeight).toBeLessThanOrEqual(fit.barTop)
  }
})

test('cô xem như học sinh vẫn vào được /em/kho-hoc-lieu', async ({ page }) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  const res = await page.goto('/em/kho-hoc-lieu')
  expect(res?.status()).not.toBe(404)
  await expectFrame(page)
})
