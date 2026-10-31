import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID, deleteTestStudents, resetAttendance, resetGroups, resetStars, seedAttendance, seedStars } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

function reset() {
  deleteTestStudents()
  resetStars()
  resetAttendance()
}
test.beforeEach(reset)
test.afterAll(reset)

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/hoc-sinh')
  await expect(page.getByRole('heading', { level: 1, name: 'Quản lý học sinh' })).toBeVisible()
}

const cards = (page: Page) => page.getByTestId('student-card')
const profile = (page: Page) => page.getByRole('region', { name: 'Hồ sơ phi hành gia' })

test('tìm không dấu và trạng thái rỗng', async ({ page }) => {
  await open(page)
  await expect(cards(page)).toHaveCount(10)
  await page.getByLabel('Tìm học sinh').fill('dung')
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText('Phạm Đức Dũng')
  await page.getByLabel('Tìm học sinh').fill('zzz')
  await expect(page.getByText('Chưa tìm thấy phi hành gia nào')).toBeVisible()
  await expect(page.getByText('Cô thử đổi từ khóa hoặc bộ lọc nhé.')).toBeVisible()
})

test('sắp xếp theo tên và theo số sao', async ({ page }) => {
  seedStars(10, 5)
  await open(page)
  await expect(cards(page).first()).toContainText('Nguyễn Minh Anh')
  await page.getByLabel('Sắp xếp').selectOption({ label: 'Theo số sao' })
  await expect(cards(page).first()).toContainText('Đỗ Anh Thư')
  await page.getByLabel('Sắp xếp').selectOption({ label: 'Theo số thứ tự' })
  await expect(cards(page).first()).toContainText('Nguyễn Minh Anh')
})

test('lọc theo điểm danh hôm nay', async ({ page }) => {
  await open(page)
  await expect(cards(page).first()).toContainText('Chưa điểm danh')
  await page.getByRole('button', { name: 'Đi trễ', exact: true }).click()
  await expect(cards(page)).toHaveCount(0)
  await expect(page.getByText('Chưa tìm thấy phi hành gia nào')).toBeVisible()

  seedAttendance(4, 'late')
  seedAttendance(1, 'present')
  seedAttendance(7, 'absent_excused')
  await page.reload()
  await page.getByRole('button', { name: 'Đi trễ', exact: true }).click()
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText('Phạm Đức Dũng')
  await expect(cards(page).first()).toContainText('Đi trễ')
  await page.getByRole('button', { name: 'Có mặt hôm nay', exact: true }).click()
  await expect(cards(page)).toHaveCount(2)
  await page.getByRole('button', { name: 'Vắng hôm nay', exact: true }).click()
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText('Vắng có phép')
})

test('hồ sơ phi hành gia', async ({ page }, info) => {
  seedStars(5, 3)
  seedAttendance(5, 'present', 1)
  seedAttendance(5, 'late', 2)
  seedAttendance(5, 'absent_unexcused', 3)
  seedAttendance(5, 'absent_excused', 4)
  await open(page)
  await cards(page).filter({ hasText: 'Võ Hà My' }).click()
  const p = profile(page)
  await expect(p.getByText('HỒ SƠ PHI HÀNH GIA')).toBeVisible()
  await expect(p.getByText('Mã HS05 · Số thứ tự 5')).toBeVisible()
  for (const label of ['Sao thi đua tích lũy', 'Sao khả dụng', 'Thứ hạng cả năm', 'Tỉ lệ chuyên cần']) {
    await expect(p.getByText(label, { exact: true })).toBeVisible()
  }
  await expect(p.getByTestId('stat-Tỉ lệ chuyên cần')).toHaveText('50%')
  await expect(p.getByTestId('stat-Sao thi đua tích lũy')).toHaveText('3')
  await expect(p.getByTestId('stat-Thứ hạng cả năm')).toHaveText('#1')
  await expect(p.getByText('Lịch sử cộng/trừ sao')).toBeVisible()
  await expect(p.getByTestId('star-history-row').first()).toContainText('+3')
  await expect(p.getByTestId('star-history-row').first()).toContainText('Hôm nay')
  await expect(p.getByText('Chưa có huy hiệu')).toBeVisible()
  await expect(p.getByText('Chưa có lượt đổi quà')).toBeVisible()
  if (info.project.name === 'desktop') await page.screenshot({ path: 'test-results/students-desktop.png', fullPage: true })
  await p.getByRole('button', { name: 'Đóng hồ sơ' }).click()
  await expect(profile(page)).toHaveCount(0)
})

test('chưa điểm danh: tỉ lệ chuyên cần là dấu gạch', async ({ page }) => {
  await open(page)
  await cards(page).filter({ hasText: 'Võ Hà My' }).click()
  await expect(profile(page).getByTestId('stat-Tỉ lệ chuyên cần')).toHaveText('—')
})

test('thêm, sửa, lưu trữ học sinh', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: '+ Thêm học sinh' }).click()
  const dialog = page.getByRole('dialog', { name: 'Thêm học sinh' })
  await dialog.getByLabel('Họ và tên').fill('Lý Thu Hà')
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(dialog).toHaveCount(0)
  const card = cards(page).filter({ hasText: 'Lý Thu Hà' })
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('Mã HS11')

  await card.click()
  await profile(page).getByRole('button', { name: 'Sửa thông tin' }).click()
  const edit = page.getByRole('dialog', { name: 'Sửa thông tin học sinh' })
  await edit.getByLabel('Họ và tên').fill('Lý Thu Hằng')
  await edit.getByRole('button', { name: 'Lưu' }).click()
  await expect(edit).toHaveCount(0)
  await expect(cards(page).filter({ hasText: 'Lý Thu Hằng' })).toHaveCount(1)
  await expect(cards(page).filter({ hasText: 'Lý Thu Hà' })).toHaveCount(0)

  await profile(page).getByRole('button', { name: 'Lưu trữ' }).click()
  const confirm = page.getByRole('dialog', { name: 'Lưu trữ học sinh?' })
  await confirm.getByRole('button', { name: 'Lưu trữ' }).click()
  await expect(confirm).toHaveCount(0)
  await expect(cards(page).filter({ hasText: 'Lý Thu Hằng' })).toHaveCount(0)
  await expect(cards(page)).toHaveCount(10)

  await page.goto('/thi-dua')
  await expect(page.getByText('Lý Thu Hằng')).toHaveCount(0)

  const { data } = await admin().from('students').select('archived_at, full_name').eq('class_id', CLASS_ID).eq('code', 'HS11')
  expect(data).toHaveLength(1)
  expect(data![0].archived_at).not.toBeNull()
})

test('tên rỗng bị chặn', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: '+ Thêm học sinh' }).click()
  const dialog = page.getByRole('dialog', { name: 'Thêm học sinh' })
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Cô hãy nhập họ và tên')
})

test.describe('Chia tổ', () => {
  test.beforeEach(resetGroups)
  test.afterAll(resetGroups)

  const gcard = (page: Page, name: string) => page.getByRole('group', { name, exact: true })
  const member = (page: Page, name: string) => page.getByTestId('group-member').filter({ hasText: name })

  async function openGroups(page: Page) {
    await open(page)
    await page.getByRole('button', { name: 'Chia tổ', exact: true }).click()
    await expect(page.getByTestId('group-card')).toHaveCount(4)
  }

  test('thẻ tổ, đặt tổ trưởng, chuyển tổ', async ({ page }, info) => {
    seedStars(1, 2)
    seedStars(2, 3)
    seedStars(3, 4)
    await openGroups(page)
    const t1 = gcard(page, 'Tổ 1')
    await expect(t1.getByTestId('group-summary')).toHaveText('3 bạn · 9 sao tích lũy')
    await expect(member(page, 'Nguyễn Minh Anh')).toContainText('Tổ trưởng')
    await expect(member(page, 'Trần Gia Bảo')).toContainText('Tổ phó')
    if (info.project.name === 'desktop') await page.screenshot({ path: 'test-results/groups-desktop.png', fullPage: true })

    await member(page, 'Trần Gia Bảo').getByRole('button', { name: 'Đặt tổ trưởng' }).click()
    await expect(member(page, 'Trần Gia Bảo')).toContainText('Tổ trưởng')
    await expect(member(page, 'Nguyễn Minh Anh')).toContainText('Thành viên')
    await expect(t1.getByText('Tổ phó', { exact: true })).toHaveCount(0)
    await expect(t1.getByText('Tổ trưởng', { exact: true })).toHaveCount(1)

    await member(page, 'Lê Khánh Chi').getByLabel('Chuyển tổ').selectOption({ label: 'Tổ 2' })
    await expect(t1.getByTestId('group-summary')).toContainText('2 bạn')
    await expect(gcard(page, 'Tổ 2').getByTestId('group-summary')).toContainText('4 bạn')
    await expect(gcard(page, 'Tổ 2').getByText('Lê Khánh Chi')).toBeVisible()
  })

  test('cộng sao cả tổ chọn sẵn cả tổ', async ({ page }) => {
    await openGroups(page)
    await gcard(page, 'Tổ 1').getByRole('link', { name: 'Cộng sao cả tổ' }).click()
    await expect(page).toHaveURL(/\/thi-dua\?to=[0-9a-f-]{36}$/)
    const pressed = page.getByTestId('students').locator('[aria-pressed="true"]')
    await expect(pressed).toHaveCount(3)
    for (const n of ['Nguyễn Minh Anh', 'Trần Gia Bảo', 'Lê Khánh Chi']) await expect(pressed.filter({ hasText: n })).toHaveCount(1)
    // id không hợp lệ hoặc không thuộc lớp: bỏ qua
    await page.goto('/thi-dua?to=khong-hop-le')
    await expect(page.getByTestId('students').locator('[aria-pressed="true"]')).toHaveCount(0)
    await page.goto('/thi-dua?to=00000000-0000-0000-0000-0000000000ff')
    await expect(page.getByTestId('students').locator('[aria-pressed="true"]')).toHaveCount(0)
  })

  test('thêm tổ rồi xóa tổ trống; tổ còn người không có nút xóa', async ({ page }) => {
    await openGroups(page)
    await expect(page.getByRole('button', { name: 'Xóa tổ' })).toHaveCount(0)
    await page.getByRole('button', { name: '+ Thêm tổ' }).click()
    await expect(page.getByLabel('Tên tổ')).toHaveValue('Tổ 5')
    await page.getByRole('button', { name: 'Lưu tổ' }).click()
    await expect(gcard(page, 'Tổ 5')).toHaveCount(1)
    await expect(gcard(page, 'Tổ 5').getByTestId('group-summary')).toHaveText('0 bạn · 0 sao tích lũy')
    await gcard(page, 'Tổ 5').getByRole('button', { name: 'Xóa tổ' }).click()
    await expect(gcard(page, 'Tổ 5')).toHaveCount(0)
    await expect(page.getByTestId('group-card')).toHaveCount(4)
  })

  test('lưu trữ thành viên: số bạn trong tổ giảm', async ({ page }) => {
    await open(page)
    await cards(page).filter({ hasText: 'Lê Khánh Chi' }).click()
    await profile(page).getByRole('button', { name: 'Lưu trữ' }).click()
    await page.getByRole('dialog', { name: 'Lưu trữ học sinh?' }).getByRole('button', { name: 'Lưu trữ' }).click()
    await expect(cards(page).filter({ hasText: 'Lê Khánh Chi' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Chia tổ', exact: true }).click()
    await expect(gcard(page, 'Tổ 1').getByTestId('group-summary')).toContainText('2 bạn')
    await expect(page.getByTestId('group-member').filter({ hasText: 'Lê Khánh Chi' })).toHaveCount(0)
    const { data } = await admin().from('group_members').select('id').eq('student_id', '00000000-0000-0000-0000-0000000b0003')
    expect(data).toHaveLength(0)
  })
})
