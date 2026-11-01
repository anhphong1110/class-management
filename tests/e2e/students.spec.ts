import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID, deleteTestStudents, resetAttendance, resetGroups, resetStars, seedAttendance, resetRewards, seedStars, sid, sql } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

async function reset() {
  await deleteTestStudents()
  resetStars()
  await resetRewards()
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

test('xóa hẳn một học sinh vừa thêm, kể cả sổ sao', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: '+ Thêm học sinh' }).click()
  const dialog = page.getByRole('dialog', { name: 'Thêm học sinh' })
  await dialog.getByLabel('Họ và tên').fill('Trần Bảo Xóa')
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(dialog).toHaveCount(0)
  const card = cards(page).filter({ hasText: 'Trần Bảo Xóa' })
  await expect(card).toHaveCount(1)

  const created = await admin().from('students').select('id').eq('class_id', CLASS_ID).eq('code', 'HS11').single()
  await admin().from('star_transactions').insert({
    class_id: CLASS_ID, student_id: created.data!.id, delta: 3, kind: 'award', note: 'thử xóa', batch_id: crypto.randomUUID(),
  })

  await card.click()
  await profile(page).getByRole('button', { name: 'Xóa học sinh' }).click()
  const confirm = page.getByRole('dialog', { name: 'Xóa học sinh?' })
  await expect(confirm).toContainText('Trần Bảo Xóa')
  await confirm.getByRole('button', { name: 'Xóa vĩnh viễn' }).click()
  await expect(confirm).toHaveCount(0)
  await expect(cards(page).filter({ hasText: 'Trần Bảo Xóa' })).toHaveCount(0)
  await expect(cards(page)).toHaveCount(10)

  const { data } = await admin().from('students').select('id').eq('class_id', CLASS_ID).eq('code', 'HS11')
  expect(data).toHaveLength(0)
  const stars = await admin().from('star_transactions').select('id').eq('student_id', created.data!.id)
  expect(stars.data).toHaveLength(0)
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

  test('học sinh chưa có tổ nằm ở thẻ "Chưa có tổ" và chuyển được vào tổ', async ({ page }) => {
    await open(page)
    await expect(page.getByRole('button', { name: 'Chia tổ', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '+ Thêm học sinh' }).click()
    const dialog = page.getByRole('dialog', { name: 'Thêm học sinh' })
    await dialog.getByLabel('Họ và tên').fill('Lý Thu Hà')
    await dialog.getByRole('button', { name: 'Lưu' }).click()
    await expect(dialog).toHaveCount(0)
    await page.getByRole('button', { name: 'Chia tổ', exact: true }).click()
    const none = gcard(page, 'Chưa có tổ')
    await expect(none.getByTestId('group-summary')).toHaveText('1 bạn')
    await expect(none.getByText('Lý Thu Hà')).toBeVisible()
    await expect(none.getByRole('button', { name: 'Đặt tổ trưởng' })).toHaveCount(0)
    await expect(none.getByRole('link', { name: 'Cộng sao cả tổ' })).toHaveCount(0)
    await member(page, 'Lý Thu Hà').getByLabel('Chuyển tổ').selectOption({ label: 'Tổ 1' })
    await expect(gcard(page, 'Tổ 1').getByTestId('group-summary')).toContainText('4 bạn')
    await expect(gcard(page, 'Tổ 1').getByText('Lý Thu Hà')).toBeVisible()
    await expect(gcard(page, 'Chưa có tổ')).toHaveCount(0)
  })
})

const REWARD_1 = '00000000-0000-0000-0000-0000000e0001'

test('lưu trữ học sinh có yêu cầu chờ: yêu cầu bị từ chối, sao được trả lại', async ({ page }) => {
  const stu = '00000000-0000-0000-0000-0000000b0099'
  sql(`insert into public.students (id, class_id, code, roll_no, full_name) values ('${stu}', '${CLASS_ID}', 'HS99', 99, 'Trần Sao Giữ')`)
  sql(`insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id) values ('${CLASS_ID}', '${stu}', 10, 'award', 'seed', gen_random_uuid())`)
  sql(`insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status) values ('00000000-0000-0000-0000-0000000f0099', '${CLASS_ID}', '${stu}', '${REWARD_1}', 10, 'pending')`)
  sql(`insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id) values ('${CLASS_ID}', '${stu}', -10, 'reserve', '00000000-0000-0000-0000-0000000f0099')`)
  await open(page)
  await cards(page).filter({ hasText: 'Trần Sao Giữ' }).click()
  await profile(page).getByRole('button', { name: 'Lưu trữ' }).click()
  const confirm = page.getByRole('dialog', { name: 'Lưu trữ học sinh?' })
  await confirm.getByRole('button', { name: 'Lưu trữ' }).click()
  await expect(confirm).toHaveCount(0)

  const { data: req } = await admin().from('reward_requests').select('status').eq('id', '00000000-0000-0000-0000-0000000f0099').single()
  expect(req!.status).toBe('rejected')
  const { data: tx } = await admin().from('star_transactions').select('delta, kind').eq('student_id', stu).order('created_at')
  expect(tx!.reduce((n, t) => n + t.delta, 0)).toBe(10)
  expect(tx!.map((t) => t.kind)).toContain('release')

  await page.goto('/doi-qua')
  const row = page.locator('div').filter({ hasText: 'Trần Sao Giữ' }).filter({ has: page.getByText('Từ chối', { exact: true }) }).last()
  await expect(row).toBeVisible()
})

test('hồ sơ: lịch sử đổi quà dùng đúng nhãn trạng thái', async ({ page }) => {
  const rows: [string, string][] = [
    ['pending', '1'], ['approved', '2'], ['delivered', '3'], ['rejected', '4'],
  ]
  rows.forEach(([status, n], i) => {
    sql(`insert into public.reward_requests (class_id, student_id, reward_id, cost, status, created_at) values ('${CLASS_ID}', '${sid(5)}', '00000000-0000-0000-0000-0000000e000${n}', 10, '${status}', now() - interval '${i} minutes')`)
  })
  await open(page)
  await cards(page).filter({ hasText: 'Võ Hà My' }).click()
  const box = profile(page).locator('div').filter({ has: page.getByRole('heading', { name: 'Lịch sử đổi quà' }) }).last()
  await expect(box).toContainText('Sticker vũ trụ')
  await expect(box).toContainText('Hôm nay')
  for (const label of ['Chờ duyệt', 'Đã duyệt, chờ trao', 'Đã nhận quà', 'Từ chối']) {
    await expect(box.getByText(label, { exact: true })).toBeVisible()
  }
  await expect(box.getByText('Từ chối', { exact: true })).toHaveCSS('color', 'rgb(142, 27, 59)')
})
