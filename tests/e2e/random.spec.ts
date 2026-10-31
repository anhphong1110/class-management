import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID, resetAttendance, resetGroups, resetStars, seedAttendance, sid, sql } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

function reset() {
  resetStars()
  resetAttendance()
  resetGroups()
  sql(`update public.class_settings set feature_random = true where class_id = '${CLASS_ID}'`)
}
test.beforeEach(reset)
test.afterAll(reset)

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/goi-ten')
  await expect(page.getByRole('heading', { level: 1, name: 'Gọi tên ngẫu nhiên' })).toBeVisible()
}

const scope = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const heading = (page: Page, text: string) => page.getByRole('heading', { level: 2, name: text })

test.describe('giảm chuyển động (dừng ngay)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('phạm vi, công tắc, quay số, cộng sao, vòng mới', async ({ page }) => {
    seedAttendance(7, 'absent_unexcused')
    await open(page)

    for (const name of ['Cả lớp', 'Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4']) await expect(scope(page, name)).toBeVisible()
    await expect(scope(page, 'Cả lớp')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('switch', { name: 'Không gọi lại bạn đã được gọi' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('switch', { name: 'Chỉ gọi bạn có mặt hôm nay' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('SẴN SÀNG QUAY')).toBeVisible()
    await expect(page.getByText('Bấm quay để chọn')).toBeVisible()
    await expect(page.getByText('Chưa gọi bạn nào trong vòng này.')).toBeVisible()
    // HS07 vắng nên cả lớp còn 9 bạn.
    await expect(heading(page, 'Đã được gọi (0/9)')).toBeVisible()

    await scope(page, 'Tổ 3').click()
    await expect(scope(page, 'Tổ 3')).toHaveAttribute('aria-pressed', 'true')
    await expect(heading(page, 'Đã được gọi (0/1)')).toBeVisible()
    await page.getByRole('switch', { name: 'Chỉ gọi bạn có mặt hôm nay' }).click()
    await expect(heading(page, 'Đã được gọi (0/2)')).toBeVisible()
    await page.getByRole('switch', { name: 'Chỉ gọi bạn có mặt hôm nay' }).click()
    await expect(heading(page, 'Đã được gọi (0/1)')).toBeVisible()

    await page.getByRole('button', { name: 'Quay số', exact: true }).click()
    await expect(page.getByText('PHI HÀNH GIA MAY MẮN', { exact: true })).toBeVisible()
    await expect(page.getByTestId('current-name')).toHaveText('Hoàng Tuấn Kiệt')
    await expect(page.getByTestId('current-meta')).toHaveText('Tổ 3 · Mã HS08')
    await expect(heading(page, 'Đã được gọi (1/1)')).toBeVisible()
    await expect(page.getByTestId('called-list')).toContainText('Hoàng Tuấn Kiệt')

    await page.getByRole('button', { name: '+1 sao cho bạn này' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Đã cộng 1 sao cho Hoàng Tuấn Kiệt.' })).toBeVisible()
    const { data, error } = await admin().from('star_transactions').select('delta, kind, note').eq('student_id', sid(8))
    expect(error).toBeNull()
    expect(data).toEqual([{ delta: 1, kind: 'award', note: 'Gọi tên ngẫu nhiên' }])

    // Hết người trong tổ
    await page.getByRole('button', { name: 'Gọi bạn tiếp theo' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Cả nhóm đã được gọi hết. Cô bấm "Bắt đầu vòng mới" nhé.' })).toBeVisible()

    // Vòng được giữ khi tải lại trang
    await page.reload()
    await scope(page, 'Tổ 3').click()
    await expect(heading(page, 'Đã được gọi (1/1)')).toBeVisible()

    await page.getByRole('button', { name: 'Bắt đầu vòng mới' }).click()
    await expect(heading(page, 'Đã được gọi (0/1)')).toBeVisible()
    await expect(page.getByText('Chưa gọi bạn nào trong vòng này.')).toBeVisible()
    await expect(page.getByText('Bấm quay để chọn')).toBeVisible()
  })

  test('tắt "không gọi lại" thì vẫn gọi được khi đã gọi hết', async ({ page }) => {
    await open(page)
    await scope(page, 'Tổ 4').click()
    await page.getByRole('button', { name: 'Quay số', exact: true }).click()
    await page.getByRole('button', { name: 'Gọi bạn tiếp theo' }).click()
    await expect(heading(page, 'Đã được gọi (2/2)')).toBeVisible()
    await page.getByRole('button', { name: 'Gọi bạn tiếp theo' }).click()
    await expect(page.getByText('Cả nhóm đã được gọi hết.', { exact: false })).toBeVisible()
    await page.getByRole('switch', { name: 'Không gọi lại bạn đã được gọi' }).click()
    await page.getByRole('button', { name: 'Quay số', exact: true }).click()
    await expect(page.getByText('PHI HÀNH GIA MAY MẮN', { exact: true })).toBeVisible()
    await expect(heading(page, 'Đã được gọi (2/2)')).toBeVisible()
  })

  test('cờ feature_random tắt thì hiện thông báo', async ({ page }) => {
    await open(page)
    sql(`update public.class_settings set feature_random = false where class_id = '${CLASS_ID}'`)
    await page.reload()
    await expect(page.getByText('Tính năng này đang tắt. Cô bật lại trong Cài đặt.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Quay số' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Gọi tên ngẫu nhiên/ }).first()).toBeVisible()
  })
})

test('hiệu ứng quay rồi dừng ở một bạn', async ({ page }) => {
  await open(page)
  await scope(page, 'Tổ 4').click()
  await page.getByRole('button', { name: 'Quay số', exact: true }).click()
  await expect(page.getByText('ĐANG QUAY...', { exact: true })).toBeVisible()
  await expect(page.getByText('PHI HÀNH GIA MAY MẮN', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('current-name')).toHaveText(/Ngô Bảo Ngọc|Đỗ Anh Thư/)
  await expect(heading(page, 'Đã được gọi (1/2)')).toBeVisible()
})

test('ảnh chụp màn hình bản desktop', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.setViewportSize({ width: 1360, height: 1100 })
  seedAttendance(7, 'absent_unexcused')
  await open(page)
  await scope(page, 'Tổ 1').click()
  await page.getByRole('button', { name: 'Quay số', exact: true }).click()
  await expect(page.getByText('PHI HÀNH GIA MAY MẮN', { exact: true })).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'test-results/random-desktop.png', fullPage: true })
})
