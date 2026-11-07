import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID, deleteTestStudents, sql } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

const NAME = 'Lý Thu Test'
const USERNAME = 'hs.thutest'
const BANNED = 'Tài khoản này đang bị khóa. Em hỏi cô giáo nhé.'
const domain = () => process.env.AUTH_EMAIL_DOMAIN ?? 'tram58.local'

let seededProfiles = new Set<string>()
let password = ''

async function profileIds() {
  const { data, error } = await admin().from('profiles').select('id')
  expect(error).toBeNull()
  return (data ?? []).map((p) => p.id as string)
}

/** Xóa mọi tài khoản mới tạo trong test (Auth, profiles xóa theo), giữ nguyên tài khoản seed. */
async function cleanAccounts() {
  const db = admin()
  for (const id of await profileIds()) {
    if (seededProfiles.has(id)) continue
    const { error } = await db.auth.admin.deleteUser(id)
    expect(error).toBeNull()
  }
}

/** Email của các tài khoản Auth không có profiles (tài khoản mồ côi). */
async function orphans() {
  const db = admin()
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
  expect(error).toBeNull()
  const have = new Set(await profileIds())
  return (data?.users ?? []).filter((u) => !have.has(u.id)).map((u) => u.email)
}

/** Đóng Modal mật khẩu tạm: bấm "Đóng" rồi xác nhận "Đã ghi, đóng". */
async function closeTemp(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Mật khẩu tạm' })
  await dialog.getByRole('button', { name: 'Đóng' }).click()
  await page.getByRole('dialog', { name: /Cô đã in hoặc ghi lại mật khẩu tạm chưa/ }).getByRole('button', { name: 'Đã ghi, đóng' }).click()
  await expect(dialog).toBeHidden()
}

async function removeAuthUser(username: string) {
  const db = admin()
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 })
  const u = data?.users.find((x) => x.email === `${username}@${domain()}`)
  if (u) await db.auth.admin.deleteUser(u.id)
}

test.beforeAll(async () => {
  seededProfiles = new Set(await profileIds())
  await deleteTestStudents()
  await removeAuthUser(USERNAME)
  sql(`insert into public.students (class_id, code, roll_no, full_name, is_demo)
       values ('${CLASS_ID}', 'TEST01', 99, '${NAME}', false)`)
})
test.afterAll(async () => {
  await removeAuthUser(USERNAME)
  await cleanAccounts()
  await deleteTestStudents()
  expect(new Set(await profileIds())).toEqual(seededProfiles)
  expect(await orphans()).toEqual([])
})

async function openSettings(page: Page) {
  await page.context().clearCookies()
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/cai-dat')
  await expect(page.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeVisible()
}

const row = (page: Page) =>
  page.getByRole('region', { name: 'Tài khoản học sinh' }).getByRole('listitem').filter({ hasText: NAME })

async function studentLogin(page: Page, username: string, pass: string) {
  await page.context().clearCookies()
  await page.goto('/dang-nhap')
  await page.getByRole('tab', { name: 'Học sinh' }).click()
  await page.getByLabel(/Tên đăng nhập/).fill(username)
  await page.getByLabel('Mật khẩu').fill(pass)
  await page.getByRole('button', { name: 'Cất cánh' }).click()
}

test('một bạn bị Auth từ chối: các bạn khác vẫn được tạo, không còn hồ sơ dư', async ({ page }) => {
  const db = admin()
  const created = await db.auth.admin.createUser({
    email: `${USERNAME}@${domain()}`,
    password: 'Mat-khau-chan-1',
    email_confirm: true,
  })
  expect(created.error).toBeNull()
  const blocker = created.data.user
  try {
    await openSettings(page)
    await expect(row(page)).toContainText('Chưa có tài khoản')
    await page.getByRole('button', { name: 'Tạo tài khoản hàng loạt' }).click()
    const dialog = page.getByRole('dialog', { name: 'Mật khẩu tạm' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Chưa tạo được:')).toBeVisible()
    await expect(dialog.getByRole('listitem').filter({ hasText: NAME })).toBeVisible()
    await expect(dialog.getByRole('cell', { name: 'hs.giabao' })).toBeVisible()
    await expect(dialog.getByText('Mật khẩu tạm chỉ hiện một lần. Cô in hoặc ghi lại trước khi đóng.')).toBeVisible()

    const { data: made } = await db.from('profiles').select('username').in('username', ['hs.giabao', USERNAME])
    expect((made ?? []).map((p) => p.username)).toEqual(['hs.giabao'])
    // Ngoài tài khoản chặn do test tạo, không còn tài khoản Auth nào thiếu profiles.
    expect(await orphans()).toEqual([`${USERNAME}@${domain()}`])

    await closeTemp(page)
    await expect(row(page)).toContainText('Chưa có tài khoản')
  } finally {
    if (blocker) await db.auth.admin.deleteUser(blocker.id)
    await cleanAccounts()
  }
})

// Nhánh hoàn tác: Auth nhận, nhưng chèn profiles lỗi. Một trigger tạm (chỉ có trong test này) làm lệnh chèn profiles
// của đúng học sinh test thất bại, nên kết quả không phụ thuộc thứ tự hay thời gian. Phải xóa tài khoản Auth vừa tạo.
test('chèn profiles lỗi thì hoàn tác: bạn đó ở "Chưa tạo được:", không còn tài khoản Auth mồ côi', async ({ page }) => {
  sql(`create function public.tmp_block_profile() returns trigger language plpgsql as $f$
         begin if new.display_name = '${NAME}' then raise exception 'tmp_block_profile'; end if; return new; end $f$;
       create trigger tmp_block_profile before insert on public.profiles for each row execute function public.tmp_block_profile()`)
  try {
    await openSettings(page)
    await page.getByRole('button', { name: 'Tạo tài khoản hàng loạt' }).click()
    const dialog = page.getByRole('dialog', { name: 'Mật khẩu tạm' })
    await expect(dialog.getByText('Chưa tạo được:')).toBeVisible()
    await expect(dialog.getByRole('listitem').filter({ hasText: NAME })).toContainText('Chưa lưu được hồ sơ tài khoản này.')
    await expect(dialog.getByRole('cell', { name: 'hs.giabao' })).toBeVisible()
    expect(await orphans()).toEqual([])
    const { data } = await admin().auth.admin.listUsers({ perPage: 1000 })
    expect(data?.users.some((u) => u.email === `${USERNAME}@${domain()}`)).toBe(false)
    await closeTemp(page)
  } finally {
    sql('drop trigger if exists tmp_block_profile on public.profiles; drop function if exists public.tmp_block_profile()')
    await cleanAccounts()
  }
})

test('Esc không đóng Modal mật khẩu tạm; "Quay lại" giữ nguyên bảng', async ({ page }) => {
  try {
    await openSettings(page)
    await page.getByRole('button', { name: 'Tạo tài khoản hàng loạt' }).click()
    const dialog = page.getByRole('dialog', { name: 'Mật khẩu tạm' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Đóng' }).click()
    await page.getByRole('dialog', { name: /Cô đã in hoặc ghi lại/ }).getByRole('button', { name: 'Quay lại' }).click()
    await expect(dialog.getByRole('cell', { name: USERNAME })).toBeVisible()
    await closeTemp(page)
  } finally {
    await cleanAccounts()
  }
})

test('tạo tài khoản hàng loạt, học sinh mới đăng nhập được', async ({ page }) => {
  await openSettings(page)
  await page.getByRole('button', { name: 'Tạo tài khoản hàng loạt' }).click()
  const dialog = page.getByRole('dialog', { name: 'Mật khẩu tạm' })
  await expect(dialog).toBeVisible()
  const cells = dialog.getByRole('row').filter({ hasText: USERNAME }).getByRole('cell')
  await expect(cells.nth(1)).toHaveText(USERNAME)
  password = (await cells.nth(2).innerText()).trim()
  expect(password).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/)
  await expect(dialog.getByRole('button', { name: 'In danh sách' })).toBeVisible()
  await closeTemp(page)
  await expect(row(page)).toContainText(USERNAME)
  await expect(row(page).getByRole('switch', { name: 'Được đăng nhập' })).toBeVisible()

  await studentLogin(page, USERNAME, password)
  await expect(page).toHaveURL(/\/em$/)
})

test('đặt lại mật khẩu: mật khẩu cũ hết dùng được', async ({ page }) => {
  await openSettings(page)
  await row(page).getByRole('button', { name: 'Đặt lại mật khẩu' }).click()
  await page.getByRole('dialog', { name: 'Đặt lại mật khẩu?' }).getByRole('button', { name: 'Đặt lại' }).click()
  const dialog = page.getByRole('dialog', { name: 'Mật khẩu tạm' })
  await expect(dialog).toBeVisible()
  const next = (await dialog.getByRole('row').filter({ hasText: USERNAME }).getByRole('cell').nth(2).innerText()).trim()
  expect(next).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/)
  expect(next).not.toBe(password)
  await closeTemp(page)

  await studentLogin(page, USERNAME, password)
  await expect(page.getByText('Tên đăng nhập hoặc mật khẩu chưa đúng.')).toBeVisible()
  await studentLogin(page, USERNAME, next)
  await expect(page).toHaveURL(/\/em$/)
  password = next
})

test('khóa rồi mở lại tài khoản', async ({ page }) => {
  await openSettings(page)
  await row(page).getByRole('switch', { name: 'Được đăng nhập' }).click()
  await expect(row(page).getByRole('switch', { name: 'Đã khóa' })).toBeVisible()

  await studentLogin(page, USERNAME, password)
  await expect(page.getByText(BANNED)).toBeVisible()
  await expect(page).toHaveURL(/\/dang-nhap/)

  await openSettings(page)
  await row(page).getByRole('switch', { name: 'Đã khóa' }).click()
  await expect(row(page).getByRole('switch', { name: 'Được đăng nhập' })).toBeVisible()
  await studentLogin(page, USERNAME, password)
  await expect(page).toHaveURL(/\/em$/)
})

test('đang đăng nhập mà bị khóa thì lần mở trang kế tiếp bị chặn', async ({ page, browser }, testInfo) => {
  await studentLogin(page, USERNAME, password)
  await expect(page).toHaveURL(/\/em$/)

  const teacher = await browser.newContext({ baseURL: testInfo.project.use.baseURL ?? 'http://localhost:3000' })
  try {
    const tp = await teacher.newPage()
    await openSettings(tp)
    await row(tp).getByRole('switch', { name: 'Được đăng nhập' }).click()
    await expect(row(tp).getByRole('switch', { name: 'Đã khóa' })).toBeVisible()
  } finally {
    await teacher.close()
  }

  await page.goto('/em')
  await expect(page).toHaveURL(/\/dang-nhap\?error=account_banned$/)
  await expect(page.getByText(BANNED)).toBeVisible()
})
