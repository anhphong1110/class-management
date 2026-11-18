import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID, resetRewards, resetStars, seedStars } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

const REWARD = (n: number) => `00000000-0000-0000-0000-0000000e000${n}`
// Hai món: Sticker vũ trụ (10 sao), Bookmark tên lửa (15 sao) => giá túi 13, tỉ lệ 60% / 40%.
const NAMES = ['Sticker vũ trụ', 'Bookmark tên lửa']

async function setSettings(values: Record<string, boolean | number>) {
  const { error } = await admin().from('class_settings').update(values).eq('class_id', CLASS_ID)
  expect(error).toBeNull()
}

let original: Record<string, boolean | number> = {}
const FLAGS = ['feature_blind_bag', 'feature_rewards', 'student_can_view_rewards', 'require_approval', 'reserve_on_request', 'only_enough', 'weekly_redeem_limit']

async function setup() {
  resetStars()
  await resetRewards()
  await setSettings({ ...original, feature_rewards: true, student_can_view_rewards: true, feature_blind_bag: true, weekly_redeem_limit: 20 })
  const { error } = await admin().from('rewards').update({ in_blind_bag: true }).in('id', [REWARD(1), REWARD(2)])
  expect(error).toBeNull()
}

test.beforeAll(async () => {
  const { data, error } = await admin().from('class_settings').select(FLAGS.join(',')).eq('class_id', CLASS_ID).single()
  expect(error).toBeNull()
  original = data as unknown as Record<string, boolean | number>
})
test.beforeEach(setup)
test.afterAll(async () => {
  resetStars()
  await resetRewards()
  await setSettings(original)
})

async function openStudent(page: Page) {
  await login(page, 'Học sinh', 'hs.hamy')
  await expect(page).toHaveURL(/\/em$/)
  await page.goto('/em/doi-qua')
}

test('cô thấy giá túi và tỉ lệ từng món, quà đắt hơn thì tỉ lệ thấp hơn', async ({ page }) => {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/doi-qua')
  const panel = page.getByTestId('blind-bag-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('switch', { name: 'Bật túi mù' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('bag-price')).toContainText('Giá túi: 13')
  const odds = await panel.getByTestId('bag-odds').allTextContents()
  expect(odds).toEqual(['60%', '40%'])
})

test('học sinh xé túi, nhận một trong hai món, trừ đúng giá túi và không thấy tỉ lệ', async ({ page }) => {
  seedStars(5, 100)
  await openStudent(page)
  const card = page.getByTestId('blind-bag-card')
  await expect(card).toContainText('Túi mù bí ẩn')
  await expect(card).toContainText('13 sao')
  await expect(card).not.toContainText('%')

  await card.getByRole('button', { name: 'Mở túi mù' }).click()
  const confirm = page.getByRole('dialog', { name: 'Mở túi mù?' })
  await expect(confirm).toContainText('13 sao')
  await confirm.getByRole('button', { name: 'Mở túi' }).click()

  const stage = page.getByTestId('blind-bag-stage')
  await expect(stage).toBeVisible()
  await expect(stage).toHaveAttribute('data-stage', /ready|fallback/, { timeout: 15_000 })
  const stageName = await stage.getAttribute('data-stage')
  if (stageName === 'fallback') {
    await stage.getByRole('button', { name: 'Xé túi' }).click()
  } else {
    // Vuốt ngang qua đỉnh túi bằng chuột, từng bước nhỏ cho giống tay người.
    const box = (await stage.boundingBox())!
    const y = box.y + box.height * 0.3
    const x0 = box.x + box.width * 0.2
    await page.mouse.move(x0, y)
    await page.mouse.down()
    for (let i = 1; i <= 24; i++) await page.mouse.move(x0 + (box.width * 0.6 * i) / 24, y + Math.sin(i / 3) * 6)
    await page.mouse.up()
  }
  await expect(stage).toHaveAttribute('data-stage', /revealed|fallback-revealed/, { timeout: 20_000 })
  const result = page.getByTestId('blind-bag-result')
  await expect(result).toContainText('Em nhận được:')
  const text = (await result.textContent()) ?? ''
  expect(NAMES.some((n) => text.includes(n))).toBe(true)

  await stage.getByRole('button', { name: 'Xong' }).click()
  await expect(stage).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Đã gửi yêu cầu đổi' })).toBeVisible()
  const mine = page.getByTestId('my-request')
  await expect(mine).toHaveCount(1)
  await expect(mine).toContainText('Túi mù')
  await expect(mine).toContainText('13 sao')
  await expect(page.getByText('Em có 87 sao khả dụng')).toBeVisible()
})

test('đóng túi trước khi xé thì không mất sao và không có yêu cầu', async ({ page }) => {
  seedStars(5, 100)
  await openStudent(page)
  await page.getByTestId('blind-bag-card').getByRole('button', { name: 'Mở túi mù' }).click()
  await page.getByRole('dialog', { name: 'Mở túi mù?' }).getByRole('button', { name: 'Mở túi' }).click()
  const stage = page.getByTestId('blind-bag-stage')
  await expect(stage).toHaveAttribute('data-stage', /ready|fallback/, { timeout: 15_000 })
  await page.keyboard.press('Escape')
  await expect(stage).toHaveCount(0)
  await expect(page.getByText('Em có 100 sao khả dụng')).toBeVisible()
  await expect(page.getByTestId('my-request')).toHaveCount(0)
})

test('thiếu sao thì nút túi mù bị khóa', async ({ page }) => {
  seedStars(5, 5)
  await openStudent(page)
  await expect(page.getByTestId('blind-bag-card').getByRole('button', { name: /Chưa đủ sao/ })).toBeDisabled()
})

test('túi tắt thì học sinh không thấy', async ({ page }) => {
  await setSettings({ feature_blind_bag: false })
  seedStars(5, 100)
  await openStudent(page)
  await expect(page.getByTestId('gift')).toHaveCount(5)
  await expect(page.getByTestId('blind-bag-card')).toHaveCount(0)
})
