import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('đăng nhập: hiện/ẩn ký tự mật khẩu và nhớ tab lần trước', async ({ page }) => {
  await page.goto('/dang-nhap')
  const pass = page.getByLabel('Mật khẩu')
  await pass.fill('abc')
  await expect(pass).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Hiện ký tự đã nhập' }).click()
  await expect(pass).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Ẩn ký tự đã nhập' }).click()
  await expect(pass).toHaveAttribute('type', 'password')

  await page.getByRole('tab', { name: 'Học sinh' }).click()
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Học sinh' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: 'Giáo viên' }).click()
})

test('tab đăng nhập đổi được bằng phím mũi tên', async ({ page }) => {
  await page.goto('/dang-nhap')
  const teacher = page.getByRole('tab', { name: 'Giáo viên' })
  await teacher.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Học sinh' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowLeft')
  await expect(teacher).toHaveAttribute('aria-selected', 'true')
})

test('menu cô giáo chia nhóm nhưng vẫn đủ 14 liên kết', async ({ page }, info) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  const nav = page.getByRole('navigation', { name: 'Menu chính' })
  await expect(nav.getByRole('link')).toHaveCount(14)
  if (info.project.name === 'desktop') {
    for (const group of ['Lớp học', 'Thi đua và quà', 'Lịch và nhiệm vụ', 'Công cụ', 'Cài đặt']) {
      await expect(nav.locator('div[aria-hidden=true]').filter({ hasText: new RegExp(`^${group}$`, 'i') })).toBeVisible()
    }
  }
})

test('cô xem như học sinh rồi quay lại trang cô giáo', async ({ page }) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.getByRole('link', { name: 'Xem như học sinh' }).first().click()
  await expect(page).toHaveURL(/\/em$/)
  await expect(page.getByText('Đang xem thử giao diện học sinh')).toBeVisible()
  await page.getByRole('link', { name: 'Quay lại trang cô giáo' }).click()
  await expect(page).toHaveURL(/\/tong-quan$/)
})
