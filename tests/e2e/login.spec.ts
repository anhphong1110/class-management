import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.local')

type DevUser = { username: string; role: string; password: string }
const users: DevUser[] = JSON.parse(readFileSync('scripts/dev-users.json', 'utf8')).users
const pw = (u: string) => users.find((x) => x.username === u)!.password

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

async function fill(page: Page, tab: 'Giáo viên' | 'Học sinh', username: string, password: string) {
  await page.getByRole('tab', { name: tab }).click()
  await page.getByLabel(/Tên đăng nhập/).fill(username)
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Cất cánh' }).click()
}

const NO_PROFILE = 'Tài khoản này chưa được gắn với lớp. Em hãy báo cô giáo nhé.'

test.describe.configure({ mode: 'serial' })

test('giáo viên đăng nhập vào /tong-quan', async ({ page }) => {
  await page.goto('/dang-nhap')
  await fill(page, 'Giáo viên', 'co.khanh', pw('co.khanh'))
  await expect(page).toHaveURL(/\/tong-quan$/)
})

test('học sinh đăng nhập vào /em', async ({ page }) => {
  await page.goto('/dang-nhap')
  await fill(page, 'Học sinh', 'hs.hamy', pw('hs.hamy'))
  await expect(page).toHaveURL(/\/em$/)
})

test('sai mật khẩu', async ({ page }) => {
  await page.goto('/dang-nhap')
  await fill(page, 'Giáo viên', 'co.khanh', 'sai-mat-khau-123')
  await expect(page.getByText('Tên đăng nhập hoặc mật khẩu chưa đúng.')).toBeVisible()
  await expect(page).toHaveURL(/\/dang-nhap/)
})

test('tên đăng nhập có dấu', async ({ page }) => {
  await page.goto('/dang-nhap')
  await fill(page, 'Học sinh', 'hs.minhánh', 'abcdef')
  await expect(
    page.getByText('Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm và gạch dưới.'),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/dang-nhap/)
})

test('đường dẫn cần đăng nhập rồi quay lại', async ({ page }) => {
  await page.goto('/thoi-khoa-bieu')
  await expect(page).toHaveURL(/\/dang-nhap\?next=%2Fthoi-khoa-bieu$/)
  await fill(page, 'Giáo viên', 'co.khanh', pw('co.khanh'))
  await expect(page).toHaveURL(/\/thoi-khoa-bieu$/)
})

for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com']) {
  test(`next không an toàn bị bỏ qua: ${bad}`, async ({ page }) => {
    await page.goto(`/dang-nhap?next=${encodeURIComponent(bad)}`)
    await fill(page, 'Giáo viên', 'co.khanh', pw('co.khanh'))
    await expect(page).toHaveURL(/localhost:3000\/tong-quan$/)
  })
}

test('tài khoản Auth không có profiles', async ({ page }) => {
  const a = admin()
  const username = `khong.ho.so.${Date.now().toString(36)}`
  const password = 'Mat-khau-thu-nghiem-1'
  const email = `${username}@${process.env.AUTH_EMAIL_DOMAIN ?? 'tram58.local'}`
  const { data, error } = await a.auth.admin.createUser({ email, password, email_confirm: true })
  expect(error).toBeNull()
  try {
    await page.goto('/dang-nhap')
    await fill(page, 'Học sinh', username, password)
    await expect(page.getByText(NO_PROFILE)).toBeVisible()
    await expect(page).toHaveURL(/\/dang-nhap/)
    await page.goto('/em')
    await expect(page).toHaveURL(/\/dang-nhap/)
  } finally {
    await a.auth.admin.deleteUser(data.user!.id)
  }
})

test('học sinh đã lưu trữ không bị lặp chuyển hướng', async ({ page }) => {
  const a = admin()
  await page.goto('/dang-nhap')
  await fill(page, 'Học sinh', 'hs.hamy', pw('hs.hamy'))
  await expect(page).toHaveURL(/\/em$/)
  try {
    const { error } = await a
      .from('students')
      .update({ archived_at: new Date().toISOString() })
      .eq('code', 'HS05')
    expect(error).toBeNull()
    await page.goto('/em')
    await expect(page).toHaveURL(/\/dang-nhap\?error=no_profile$/)
    await expect(page.getByText(NO_PROFILE)).toBeVisible()
  } finally {
    await a.from('students').update({ archived_at: null }).eq('code', 'HS05')
  }
})

test('ảnh logo và không tràn ngang', async ({ page }) => {
  await page.goto('/dang-nhap')
  await expect(page.getByAltText('Logo trường Tiểu học Chính Nghĩa')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  )
  expect(overflow).toBe(true)
})
