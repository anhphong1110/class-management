import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'

test.describe.configure({ mode: 'serial' })

const CLASS_ID = '00000000-0000-0000-0000-000000000058'
const HAMY_ID = '00000000-0000-0000-0000-0000000b0005'
const HAMY_AVATAR = '00000000-0000-0000-0000-0000000a0005'

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/ho-so')
  await expect(page.getByRole('heading', { level: 1, name: 'Hồ sơ và avatar' })).toBeVisible()
}

async function cleanup() {
  const a = admin()
  await a.from('students').update({ avatar_id: HAMY_AVATAR }).eq('id', HAMY_ID)
  await a.from('class_settings').update({ student_can_change_avatar: true }).eq('class_id', CLASS_ID)
  const { data } = await a.from('avatar_library').select('id, image_path').eq('class_id', CLASS_ID).eq('kind', 'upload')
  if (data?.length) {
    await a.storage.from('class-media').remove(data.map((r) => r.image_path!).filter(Boolean))
    await a.from('avatar_library').delete().in('id', data.map((r) => r.id))
  }
}

test.beforeEach(cleanup)
test.afterAll(cleanup)

test('liệt kê người và chọn Võ Hà My', async ({ page }, info) => {
  await open(page)
  const people = page.getByTestId('people')
  await expect(people.getByRole('button')).toHaveCount(11)
  await expect(people.getByRole('button').first()).toContainText('Cô Khanh')
  await expect(people.getByRole('button').first()).toContainText('Giáo viên – Admin')
  await people.getByRole('button', { name: /Võ Hà My/ }).click()
  const cur = page.getByTestId('current')
  await expect(cur).toContainText('HỌC SINH')
  await expect(cur).toContainText('Võ Hà My')
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: 'test-results/profile-desktop.png', fullPage: true })
  }
})

test('đổi avatar cho Hà My và giữ sau khi tải lại', async ({ page }) => {
  await open(page)
  await page.getByTestId('people').getByRole('button', { name: /Võ Hà My/ }).click()
  await page.getByTestId('library').getByRole('button', { name: 'Phi hành gia 3', exact: true }).click()
  await expect(page.getByText('Đang chọn: Phi hành gia 3')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu avatar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã đổi avatar của Võ Hà My.' })).toBeVisible()
  await page.reload()
  await page.getByTestId('people').getByRole('button', { name: /Võ Hà My/ }).click()
  await expect(page.getByTestId('current')).toContainText('Avatar hiện tại: Phi hành gia 3')
})

test('tải ảnh lên thư viện và từ chối ảnh quá 5 MB', async ({ page }) => {
  await open(page)
  const tiles = page.getByTestId('library').locator('button[aria-pressed]')
  await expect(tiles).toHaveCount(12)
  await expect(tiles).toHaveText(['Phi hành gia 1', 'Phi hành gia 2', 'Phi hành gia 3', 'Phi hành gia 4', 'Phi hành gia 5', 'Phi hành gia 6', 'Cô giáo', 'Phi hành gia 8', 'Phi hành gia 9', 'Phi hành gia 10', 'Phi hành gia 11', 'Phi hành gia 12'])
  const input = page.locator('input[type=file]')
  await input.setInputFiles('tests/e2e/fixtures/avatar.png')
  await expect(tiles).toHaveCount(13)
  await expect(page.getByTestId('library').getByRole('button', { name: 'avatar', exact: true })).toBeVisible()
  await expect(page.getByTestId('library').locator('img')).toHaveCount(1)
  await expect(tiles.nth(12)).toHaveText('avatar')

  await input.setInputFiles({ name: 'lon.png', mimeType: 'image/png', buffer: Buffer.alloc(6 * 1024 * 1024) })
  await expect(page.getByText('Ảnh lớn hơn 5 MB, cô chọn ảnh nhỏ hơn nhé.')).toBeVisible()
  await expect(tiles).toHaveCount(13)

  await input.setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: Buffer.alloc(10) })
  await expect(page.getByText('Chỉ nhận ảnh JPG, PNG hoặc WEBP.')).toBeVisible()
  await expect(tiles).toHaveCount(13)
})

test('công tắc quyền đổi avatar của học sinh', async ({ page }) => {
  const a = admin()
  await open(page)
  const sw = page.getByRole('switch', { name: 'Quyền đổi avatar của học sinh' })
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await expect
    .poll(async () => (await a.from('class_settings').select('student_can_change_avatar').eq('class_id', CLASS_ID).single()).data?.student_can_change_avatar)
    .toBe(false)
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Quyền đổi avatar của học sinh' })).toHaveAttribute('aria-checked', 'false')
  await page.getByRole('switch', { name: 'Quyền đổi avatar của học sinh' }).click()
  await expect(page.getByRole('switch', { name: 'Quyền đổi avatar của học sinh' })).toHaveAttribute('aria-checked', 'true')
  await expect
    .poll(async () => (await a.from('class_settings').select('student_can_change_avatar').eq('class_id', CLASS_ID).single()).data?.student_can_change_avatar)
    .toBe(true)
})
