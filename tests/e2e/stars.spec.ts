import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { admin, login, pw } from './helpers'
import { CLASS_ID, resetRewards, resetStars, seedStars, sid, sql } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/thi-dua')
  await expect(page.getByRole("heading", { level: 1, name: "Trạm năng lượng ngôi sao" })).toBeVisible()
}

const card = (page: Page, name: string) => page.getByTestId('students').getByRole('button', { name: new RegExp(name) })
const history = (page: Page) => page.getByTestId('history')

async function resetAll() {
  resetStars()
  await resetRewards()
}
test.beforeEach(resetAll)
test.afterAll(resetAll)

test('chọn Tổ 1, cộng 2 sao theo tiêu chí Giúp đỡ bạn bè', async ({ page }, info) => {
  await open(page)
  await page.getByRole('button', { name: 'Tổ 1 (3 bạn)' }).click()
  await expect(page.getByRole('heading', { name: '1. Chọn học sinh (đã chọn 3)' })).toBeVisible()
  await page.getByTestId('criteria-picker').getByRole('button', { name: /Giúp đỡ bạn bè/ }).click()
  await page.getByRole('button', { name: 'Xác nhận cộng sao' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã cộng 2 sao cho Nguyễn Minh Anh, Trần Gia Bảo và 1 bạn khác.' })).toBeVisible()
  await expect(card(page, 'Nguyễn Minh Anh')).toContainText('2 sao khả dụng')
  await expect(card(page, 'Lê Khánh Chi')).toContainText('2 sao khả dụng')
  await expect(card(page, 'Phạm Đức Dũng')).toContainText('0 sao khả dụng')
  await expect(history(page)).toContainText('+2')
  await expect(history(page).getByTestId('history-row').first()).toContainText('Nguyễn Minh Anh, Trần Gia Bảo và 1 bạn khác')
  await expect(history(page)).toContainText('Giúp đỡ bạn bè')
  await expect(page.getByTestId('star-burst')).toBeAttached()
  await page.screenshot({ path: `test-results/stars-${info.project.name}.png`, fullPage: true })
})

test('số sao tùy chỉnh bị giới hạn trong 1 đến 100', async ({ page }) => {
  await open(page)
  await card(page, 'Nguyễn Minh Anh').click()
  const input = page.getByLabel('Tùy chỉnh')
  await input.fill('150')
  await expect(input).toHaveValue('100')
  await expect(page.getByText('Cộng 100 sao cho 1 học sinh')).toBeVisible()
})

test('báo lỗi khi chưa chọn học sinh hoặc chưa có lý do', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Xác nhận cộng sao' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Cô hãy chọn ít nhất một học sinh.' })).toBeVisible()
  await card(page, 'Nguyễn Minh Anh').click()
  await page.getByRole('button', { name: 'Xác nhận cộng sao' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Cô hãy chọn một tiêu chí hoặc nhập lý do.' })).toBeVisible()
  await expect(card(page, 'Nguyễn Minh Anh')).toContainText('0 sao khả dụng')
})

test('trừ sao: không đủ sao, hộp xác nhận, hủy rồi đồng ý', async ({ page }) => {
  seedStars(2, 2)
  await open(page)
  await page.getByRole('button', { name: '− Trừ sao' }).click()
  await expect(page.getByTestId('amounts').getByRole('button')).toHaveText(['−1', '−2', '−3', '−5'])
  await card(page, 'Nguyễn Minh Anh').click()
  await page.getByTestId('criteria-picker').getByRole('button', { name: /Mất trật tự/ }).click()
  await page.getByRole('button', { name: 'Xác nhận trừ sao' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Không đủ sao khả dụng để trừ: Nguyễn Minh Anh.' })).toBeVisible()

  await card(page, 'Nguyễn Minh Anh').click()
  await card(page, 'Trần Gia Bảo').click()
  await page.getByRole('button', { name: 'Xác nhận trừ sao' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Cô muốn trừ 1 sao của Trần Gia Bảo với lý do "Mất trật tự"?')
  await dialog.getByRole('button', { name: 'Hủy' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(card(page, 'Trần Gia Bảo')).toContainText('2 sao khả dụng')

  await page.getByRole('button', { name: 'Xác nhận trừ sao' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Đồng ý trừ sao' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã trừ 1 sao cho Trần Gia Bảo.' })).toBeVisible()
  await expect(card(page, 'Trần Gia Bảo')).toContainText('1 sao khả dụng')
  await expect(history(page)).toContainText('−1')
})

test('hoàn tác một dòng cộng sao chỉ một lần', async ({ page }) => {
  await open(page)
  await card(page, 'Nguyễn Minh Anh').click()
  await page.getByTestId('criteria-picker').getByRole('button', { name: /Hoàn thành tốt nhiệm vụ/ }).click()
  await page.getByRole('button', { name: 'Xác nhận cộng sao' }).click()
  await expect(card(page, 'Nguyễn Minh Anh')).toContainText('2 sao khả dụng')

  await history(page).getByRole('button', { name: 'Hoàn tác' }).click()
  const undoDialog = page.getByRole('dialog')
  await expect(undoDialog).toContainText('Cô muốn hoàn tác lượt +2 của Nguyễn Minh Anh?')
  await undoDialog.getByRole('button', { name: 'Hủy' }).click()
  await expect(undoDialog).toHaveCount(0)
  await expect(card(page, 'Nguyễn Minh Anh')).toContainText('2 sao khả dụng')
  await history(page).getByRole('button', { name: 'Hoàn tác' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Đồng ý hoàn tác' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã hoàn tác. Hệ thống ghi thêm một bản ghi mới, bản ghi cũ vẫn được giữ.' })).toBeVisible()
  await expect(card(page, 'Nguyễn Minh Anh')).toContainText('0 sao khả dụng')
  const rows = history(page).getByTestId('history-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('Hoàn tác: Hoàn thành tốt nhiệm vụ')
  await expect(rows.nth(0).getByRole('button')).toHaveText('Đã ghi')
  await expect(rows.nth(1).getByRole('button')).toHaveText('Đã hoàn tác')
  await expect(rows.nth(1).getByRole('button')).toBeDisabled()
  await expect(rows.nth(0).getByRole('button')).toBeDisabled()
  await expect(rows).toHaveCount(2)
})

test('thêm tiêu chí Đọc sách 2 sao', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: '+ Thêm tiêu chí' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Tên tiêu chí').fill('Đọc sách')
  await dialog.getByLabel('Số sao mặc định').fill('2')
  await dialog.getByRole('button', { name: 'Lưu tiêu chí' }).click()
  await expect(dialog).toHaveCount(0)
  const manage = page.getByTestId('manage')
  await expect(manage).toContainText('Đọc sách')
  await expect(page.getByTestId('criteria-picker').getByRole('button', { name: /Đọc sách/ })).toBeVisible()

  await manage.getByRole('button', { name: 'Sửa tiêu chí Đọc sách', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Tên tiêu chí').fill('Đọc sách nhiều')
  await page.getByRole('dialog').getByRole('button', { name: 'Lưu tiêu chí' }).click()
  await expect(manage).toContainText('Đọc sách nhiều')

  await manage.getByRole('button', { name: 'Lưu trữ tiêu chí Đọc sách nhiều' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Đồng ý lưu trữ' }).click()
  await expect(manage).not.toContainText('Đọc sách nhiều')
  await expect(page.getByTestId('criteria-picker')).not.toContainText('Đọc sách nhiều')
})

test('lịch sử vẫn hiện tên học sinh đã lưu trữ', async ({ page }) => {
  await open(page)
  await card(page, 'Nguyễn Minh Anh').click()
  await card(page, 'Trần Gia Bảo').click()
  await page.getByTestId('criteria-picker').getByRole('button', { name: /Hoàn thành tốt nhiệm vụ/ }).click()
  await page.getByRole('button', { name: 'Xác nhận cộng sao' }).click()
  await expect(history(page).getByTestId('history-row')).toHaveCount(1)
  sql(`update public.students set archived_at = now() where id = '${sid(2)}' and class_id = '${CLASS_ID}'`)
  try {
    await page.reload()
    const row = history(page).getByTestId('history-row').first()
    await expect(row).toContainText('Nguyễn Minh Anh, Trần Gia Bảo')
  } finally {
    sql(`update public.students set archived_at = null where id = '${sid(2)}'`)
  }
})

test('không hoàn tác được lượt cộng khi sao đang được giữ cho yêu cầu quà', async ({ page }) => {
  seedStars(5, 10)
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: e1 } = await c.auth.signInWithPassword({ email: `hs.hamy@${process.env.AUTH_EMAIL_DOMAIN ?? 'tram58.local'}`, password: pw('hs.hamy') })
  if (e1) throw e1
  const { error: e2 } = await c.rpc('request_reward', { p_reward_id: '00000000-0000-0000-0000-0000000e0001' })
  if (e2) throw e2

  await open(page)
  await history(page).getByRole('button', { name: 'Hoàn tác' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Đồng ý hoàn tác' }).click()
  await expect(page.getByText('Không thể hoàn tác vì Võ Hà My không đủ sao khả dụng.')).toBeVisible()
  const { data: tx } = await admin().from('star_transactions').select('kind, delta').eq('student_id', sid(5))
  expect(tx!.filter((t) => t.kind === 'reversal')).toHaveLength(0)
  const competition = tx!.filter((t) => ['award', 'penalty', 'reversal'].includes(t.kind)).reduce((n, t) => n + t.delta, 0)
  expect(competition).toBe(10)
})
