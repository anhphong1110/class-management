import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { admin, login, pw } from './helpers'
import { CLASS_ID, resetStars, seedStars, sql } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

const REWARD = (n: number) => `00000000-0000-0000-0000-0000000e000${n}`
const SEED_STOCK = [30, 20, 8, 12, 5]

async function studentRequest(username: string, rewardId: string) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const email = `${username}@${process.env.AUTH_EMAIL_DOMAIN ?? 'tram58.local'}`
  const { error: e1 } = await c.auth.signInWithPassword({ email, password: pw(username) })
  if (e1) throw e1
  return c.rpc('request_reward', { p_reward_id: rewardId })
}

function cleanup() {
  resetStars()
  sql(`delete from public.reward_requests where class_id = '${CLASS_ID}'`)
  sql(`delete from public.rewards where class_id = '${CLASS_ID}' and is_demo = false`)
  SEED_STOCK.forEach((stock, i) => {
    const names = ['Sticker vũ trụ', 'Bookmark tên lửa', 'Bút dễ thương', 'Huy hiệu phi hành gia', 'Quà bí mật']
    const costs = [10, 15, 25, 30, 50]
    sql(`update public.rewards set stock = ${stock}, hidden = false, image_path = null, name = '${names[i]}', cost = ${costs[i]} where id = '${REWARD(i + 1)}'`)
  })
}

test.beforeEach(cleanup)
test.afterAll(cleanup)

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/doi-qua')
  await expect(page.getByRole('heading', { level: 1, name: 'Trạm đổi quà vũ trụ' })).toBeVisible()
}

const card = (page: Page, name: string) => page.getByTestId('reward-card').filter({ has: page.getByRole('heading', { name, exact: true }) })
const editor = (page: Page) => page.getByRole('region', { name: 'Sửa phần thưởng' })

test('lưới 5 quà mẫu với nhãn và tồn kho', async ({ page }, info) => {
  await open(page)
  await expect(page.getByTestId('reward-card')).toHaveCount(5)
  const sticker = card(page, 'Sticker vũ trụ')
  await expect(sticker).toContainText('Bộ sticker phi hành gia và hành tinh.')
  await expect(sticker).toContainText('10')
  await expect(sticker).toContainText('Còn quà')
  await expect(sticker).toContainText('Còn 30')
  sql(`update public.rewards set stock = 0 where id = '${REWARD(5)}'`)
  await page.reload()
  await expect(card(page, 'Quà bí mật')).toContainText('Hết quà')
  await expect(card(page, 'Quà bí mật')).toContainText('Còn 0')
  if (info.project.name === 'desktop') {
    seedStars(5, 100)
    await studentRequest('hs.hamy', REWARD(1))
    await page.reload()
    await page.screenshot({ path: 'test-results/rewards-desktop.png', fullPage: true })
  }
})

test('thêm, sửa, ẩn phần thưởng', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: '+ Thêm phần thưởng' }).click()
  await expect(editor(page)).toBeVisible()
  await editor(page).getByLabel('Tên quà').fill('Bút chì màu')
  await editor(page).getByLabel('Giá (sao)').fill('12')
  await editor(page).getByLabel('Số lượng trong kho').fill('4')
  await editor(page).getByRole('button', { name: 'Bút', exact: true }).click()
  await editor(page).getByRole('button', { name: 'Xong' }).click()
  await expect(editor(page)).toHaveCount(0)
  const c = card(page, 'Bút chì màu')
  await expect(c).toBeVisible()
  await expect(c).toContainText('12')
  await expect(c).toContainText('Còn 4')

  await c.getByRole('button', { name: 'Sửa' }).click()
  await editor(page).getByLabel('Giá (sao)').fill('15')
  await editor(page).getByRole('button', { name: 'Xong' }).click()
  await expect(editor(page)).toHaveCount(0)
  await expect(card(page, 'Bút chì màu')).toContainText('15')

  await card(page, 'Bút chì màu').getByRole('button', { name: 'Ẩn' }).click()
  await expect(card(page, 'Bút chì màu')).toContainText('Đã ẩn')
  const { data } = await admin().from('rewards').select('id').eq('name', 'Bút chì màu').single()
  seedStars(5, 100)
  const res = await studentRequest('hs.hamy', data!.id)
  expect(res.error).toBeTruthy()
})

test('duyệt, trao quà và tồn kho giảm', async ({ page }) => {
  seedStars(5, 100)
  const r = await studentRequest('hs.hamy', REWARD(1))
  expect(r.error).toBeNull()
  await open(page)
  await expect(page.getByText('1 yêu cầu chờ duyệt')).toBeVisible()
  await expect(card(page, 'Sticker vũ trụ')).toContainText('Còn 29 (đang giữ 1)')
  const row = page.getByTestId('request-row').first()
  await expect(row).toContainText('Võ Hà My')
  await expect(row).toContainText('Sticker vũ trụ')
  await expect(row).toContainText('Chờ duyệt')
  await row.getByRole('button', { name: 'Duyệt' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã duyệt: trừ 10 sao của Võ Hà My và cập nhật tồn kho. Yêu cầu này không thể xử lý lần hai.' })).toBeVisible()
  await expect(row).toContainText('Đã duyệt, chờ trao')
  await expect(card(page, 'Sticker vũ trụ')).toContainText('Còn 29')
  await expect(card(page, 'Sticker vũ trụ')).not.toContainText('đang giữ')
  await row.getByRole('button', { name: 'Đã trao quà' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã ghi nhận trao quà cho Võ Hà My.' })).toBeVisible()
  await expect(row).toContainText('Đã nhận quà')
})

test('từ chối trả lại sao và quà', async ({ page }) => {
  seedStars(5, 100)
  expect((await studentRequest('hs.hamy', REWARD(2))).error).toBeNull()
  await open(page)
  const row = page.getByTestId('request-row').first()
  await row.getByRole('button', { name: 'Từ chối' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã từ chối. Số sao và quà đã giữ được trả lại cho Võ Hà My.' })).toBeVisible()
  await expect(row).toContainText('Từ chối')
  await expect(page.getByText('0 yêu cầu chờ duyệt')).toBeVisible()
})

test('bấm Duyệt nhanh hai lần chỉ có một thông báo thành công', async ({ page }) => {
  seedStars(5, 100)
  expect((await studentRequest('hs.hamy', REWARD(1))).error).toBeNull()
  await open(page)
  const row = page.getByTestId('request-row').first()
  await row.getByRole('button', { name: 'Duyệt' }).dblclick()
  await expect(page.getByRole('status').filter({ hasText: 'Đã duyệt: trừ 10 sao' })).toHaveCount(1)
  await expect(row).toContainText('Đã duyệt, chờ trao')
  await expect(page.getByText('Yêu cầu này đã được xử lý.')).toHaveCount(0)
})

test('tải ảnh quà lên thì thẻ hiện ảnh', async ({ page }) => {
  await open(page)
  await card(page, 'Sticker vũ trụ').getByRole('button', { name: 'Sửa' }).click()
  await editor(page).locator('input[type=file]').setInputFiles('tests/e2e/fixtures/avatar.png')
  await editor(page).getByRole('button', { name: 'Xong' }).click()
  await expect(editor(page)).toHaveCount(0)
  await expect(card(page, 'Sticker vũ trụ').locator('img')).toBeVisible()
  const { data } = await admin().from('rewards').select('image_path').eq('id', REWARD(1)).single()
  expect(data?.image_path).toBeTruthy()
})
