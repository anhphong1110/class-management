import { expect, test } from '@playwright/test'
import { TEACHER_NAV } from '../../components/layout/nav'
import { admin, login, openTeacherMenu } from './helpers'

test.describe.configure({ mode: 'serial' })

/** Tiêu đề h1 của từng trang, chép từ bản vẽ (khác nhãn Sidebar). */
const PAGE_TITLES: Record<string, string> = {
  '/tong-quan': 'Tổng quan',
  '/hoc-sinh': 'Quản lý học sinh',
  '/diem-danh': 'Điểm danh phi hành đoàn',
  '/thi-dua': 'Trạm năng lượng ngôi sao',
  '/xep-hang': 'Bảng xếp hạng phi hành gia xuất sắc',
  '/doi-qua': 'Trạm đổi quà vũ trụ',
  '/goi-ten': 'Gọi tên ngẫu nhiên',
  '/thoi-khoa-bieu': 'Lịch bay của phi hành gia',
  '/thong-bao': 'Tín hiệu từ trạm chỉ huy',
  '/nhiem-vu': 'Nhiệm vụ phi hành gia',
  '/bao-cao': 'Thống kê – Báo cáo',
  '/cai-dat': 'Cài đặt',
  '/ho-so': 'Hồ sơ và avatar',
}

const CLASS_ID = '00000000-0000-0000-0000-000000000058'

test('Sidebar và Header ở /tong-quan', async ({ page }, info) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await openTeacherMenu(page)
  const nav = page.getByRole('navigation', { name: 'Menu chính' })
  await expect(nav.getByRole('link')).toHaveCount(14)
  await expect(nav.getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Lớp Năm 8 (5/8) · 2026 – 2027')).toBeVisible()
  await expect(page.getByText(/^(Thứ [^,]+|Chủ Nhật), \d{2}\/\d{2}\/\d{4}$/)).toBeVisible()
  await page.screenshot({ path: `test-results/shell-${info.project.name}.png`, fullPage: true })
})

test('bấm từng link Sidebar không lỗi', async ({ page }) => {
  test.setTimeout(90_000) // đi qua mọi mục menu, chậm khi chạy cả bộ
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  for (const item of TEACHER_NAV) {
    if (item.href === '/trinh-chieu') continue // không có Sidebar sau khi vào
    await openTeacherMenu(page)
    const nav = page.getByRole('navigation', { name: 'Menu chính' })
    const res = await Promise.all([
      page.waitForURL(`**${item.href}`),
      nav.getByRole('link', { name: item.label, exact: true }).click(),
    ])
    expect(res).toBeTruthy()
    await expect(page.getByRole('heading', { level: 1, name: PAGE_TITLES[item.href] })).toBeVisible()
  }
  const r = await page.goto('/trinh-chieu')
  expect(r!.status()).toBeLessThan(500)
  await expect(page).toHaveURL(/\/trinh-chieu$/)
})

test('bố cục responsive', async ({ page }, info) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(await fits()).toBe(true)
  if (info.project.name === 'desktop') {
    const w = await page.evaluate(() => document.querySelector('aside')!.getBoundingClientRect().width)
    expect(w).toBeGreaterThanOrEqual(248)
    expect(w).toBeLessThanOrEqual(272)
    await expect(page.getByRole('button', { name: 'Mở menu' })).toBeHidden()
    await expect(page.getByTestId('sidebar-foot')).toBeVisible()
    return
  }
  // Điện thoại và máy tính bảng: menu ẩn sẵn, chỉ có thanh trên với nút ☰.
  const nav = page.getByRole('navigation', { name: 'Menu chính' })
  await expect(nav).toBeHidden()
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await expect(nav).toBeVisible()
  await expect(nav.getByRole('link')).toHaveCount(14)
  await expect(page.getByTestId('sidebar-foot')).toBeVisible()
  expect(await fits()).toBe(true)
  // Esc đóng ngăn kéo; chọn một mục thì đi tới trang đó và ngăn kéo tự đóng.
  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await nav.getByRole('link', { name: 'Điểm danh', exact: true }).click()
  await expect(page).toHaveURL(/\/diem-danh$/)
  await expect(nav).toBeHidden()
})

test('theme pink đổi --primary và bg-primary', async ({ page }) => {
  const a = admin()
  try {
    await login(page, 'Giáo viên', 'co.khanh')
    await expect(page).toHaveURL(/\/tong-quan$/)
    const shell = page.getByTestId('teacher-shell')
    // Banner /tong-quan giờ là cảnh vũ trụ cố định (không theo màu chủ đề), nên chỉ kiểm tra biến --primary của khung.
    const before = await shell.evaluate((el) => getComputedStyle(el).getPropertyValue('--primary').trim())
    expect(before.toUpperCase()).toBe('#4DA3FF')
    const { error } = await a.from('classes').update({ theme: 'pink' }).eq('id', CLASS_ID)
    expect(error).toBeNull()
    await page.reload()
    const v = await shell.evaluate((el) => getComputedStyle(el).getPropertyValue('--primary').trim())
    expect(v.toUpperCase()).toBe('#F46FA5')
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

test('giáo viên xem thử /em', async ({ page }) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/em')
  await expect(page).toHaveURL(/\/em$/)
  await expect(page.getByText('Đây là bản xem thử giao diện học sinh.')).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Xin chào/ })).toBeVisible()
})

test('học sinh: /em chào tên, /hoc-sinh bị đưa về /em', async ({ page }) => {
  await login(page, 'Học sinh', 'hs.hamy')
  await expect(page).toHaveURL(/\/em$/)
  await expect(page.getByRole('heading', { name: 'Xin chào, Hà My!' })).toBeVisible()
  await expect(page.getByText('Đây là bản xem thử')).toHaveCount(0)
  await page.goto('/hoc-sinh')
  await expect(page).toHaveURL(/\/em$/)
})
