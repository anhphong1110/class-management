import { expect, test } from '@playwright/test'
import { TEACHER_NAV } from '../../components/layout/nav'
import { admin, login } from './helpers'

test.describe.configure({ mode: 'serial' })

const CLASS_ID = '00000000-0000-0000-0000-000000000058'

test('Sidebar và Header ở /tong-quan', async ({ page }, info) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  const nav = page.getByRole('navigation', { name: 'Menu chính' })
  await expect(nav.getByRole('link')).toHaveCount(14)
  await expect(nav.getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Lớp Năm 8 (5/8) · 2026 – 2027')).toBeVisible()
  await expect(page.getByText(/^(Thứ [^,]+|Chủ Nhật), \d{2}\/\d{2}\/\d{4}$/)).toBeVisible()
  await page.screenshot({ path: `test-results/shell-${info.project.name}.png`, fullPage: true })
})

test('bấm từng link Sidebar không lỗi', async ({ page }) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  for (const item of TEACHER_NAV) {
    if (item.href === '/trinh-chieu') continue // không có Sidebar sau khi vào
    const nav = page.getByRole('navigation', { name: 'Menu chính' })
    const res = await Promise.all([
      page.waitForURL(`**${item.href}`),
      nav.getByRole('link', { name: item.label, exact: true }).click(),
    ])
    expect(res).toBeTruthy()
    await expect(page.getByRole('heading', { level: 1, name: item.label })).toBeVisible()
  }
  const r = await page.goto('/trinh-chieu')
  expect(r!.status()).toBeLessThan(500)
  await expect(page).toHaveURL(/\/trinh-chieu$/)
})

test('cỡ mobile: menu cuộn ngang, chân menu ẩn, không tràn ngang', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile')
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  const nav = page.getByRole('navigation', { name: 'Menu chính' })
  const dir = await nav.evaluate((el) => getComputedStyle(el.querySelector('ul')!).flexDirection)
  expect(dir).toBe('row')
  await expect(page.getByTestId('sidebar-foot')).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('theme pink đổi --primary và bg-primary', async ({ page }) => {
  const a = admin()
  try {
    await login(page, 'Giáo viên', 'co.khanh')
    await expect(page).toHaveURL(/\/tong-quan$/)
    const shell = page.getByTestId('teacher-shell')
    const accent = page.getByTestId('primary-accent')
    const bg = () => accent.evaluate((el) => getComputedStyle(el).backgroundColor)
    const before = await bg()
    expect(before).toBe('rgb(102, 117, 232)')
    const { error } = await a.from('classes').update({ theme: 'pink' }).eq('id', CLASS_ID)
    expect(error).toBeNull()
    await page.reload()
    const v = await shell.evaluate((el) => getComputedStyle(el).getPropertyValue('--primary').trim())
    expect(v.toUpperCase()).toBe('#F46FA5')
    expect(await bg()).toBe('rgb(244, 111, 165)')
  } finally {
    await a.from('classes').update({ theme: 'indigo' }).eq('id', CLASS_ID)
  }
})

test('Đăng xuất về /dang-nhap', async ({ page }) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/dang-nhap/)
})

test('học sinh: /em chào tên, /hoc-sinh bị đưa về /em', async ({ page }) => {
  await login(page, 'Học sinh', 'hs.hamy')
  await expect(page).toHaveURL(/\/em$/)
  await expect(page.getByRole('heading', { name: 'Xin chào, Hà My!' })).toBeVisible()
  await page.goto('/hoc-sinh')
  await expect(page).toHaveURL(/\/em$/)
})
