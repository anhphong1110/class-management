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

const region = (page: Page) => page.getByRole('region', { name: 'Tài khoản học sinh' })
const pick = (page: Page, name: string) => region(page).getByRole('checkbox', { name: `Chọn ${name}` })

/** Cô chọn các bạn, bấm "Đặt mật khẩu", nhập mật khẩu và lưu. */
async function setPasswordFor(page: Page, names: string[], pass: string) {
  for (const n of names) await pick(page, n).check()
  await region(page).getByRole('button', { name: /^Đặt mật khẩu cho/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Đặt mật khẩu' })
  await dialog.getByLabel('Mật khẩu mới').fill(pass)
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  return dialog
}

async function displayName(username: string) {
  const { data } = await admin().from('profiles').select('display_name').eq('username', username).single()
  return data!.display_name as string
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
    await expect(region(page).getByText('Chưa tạo được:')).toBeVisible()
    await expect(region(page).getByRole('listitem').filter({ hasText: `${NAME}:` })).toBeVisible()
    await expect(region(page).getByText('Đã tạo', { exact: false })).toBeVisible()

    const { data: made } = await db.from('profiles').select('username').in('username', ['hs.giabao', USERNAME])
    expect((made ?? []).map((p) => p.username)).toEqual(['hs.giabao'])
    // Ngoài tài khoản chặn do test tạo, không còn tài khoản Auth nào thiếu profiles.
    expect(await orphans()).toEqual([`${USERNAME}@${domain()}`])
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
    await expect(region(page).getByText('Chưa tạo được:')).toBeVisible()
    await expect(region(page).getByRole('listitem').filter({ hasText: `${NAME}:` })).toContainText('Chưa lưu được hồ sơ tài khoản này.')
    expect(await orphans()).toEqual([])
    const { data } = await admin().auth.admin.listUsers({ perPage: 1000 })
    expect(data?.users.some((u) => u.email === `${USERNAME}@${domain()}`)).toBe(false)
  } finally {
    sql('drop trigger if exists tmp_block_profile on public.profiles; drop function if exists public.tmp_block_profile()')
    await cleanAccounts()
  }
})

test('tạo tài khoản hàng loạt: không hiện mật khẩu, các bạn mới được chọn sẵn, chưa ai đăng nhập được', async ({ page }) => {
  await openSettings(page)
  await page.getByRole('button', { name: 'Tạo tài khoản hàng loạt' }).click()
  await expect(row(page)).toContainText(USERNAME)
  await expect(region(page).getByText('Đã tạo', { exact: false })).toBeVisible()
  await expect(page.getByText('Mật khẩu tạm')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(pick(page, NAME)).toBeChecked()
  await expect(row(page).getByRole('switch', { name: 'Được đăng nhập' })).toBeVisible()

  // Cô chưa đặt mật khẩu: không có mật khẩu nào để học sinh đăng nhập.
  await studentLogin(page, USERNAME, 'bat-ky-123')
  await expect(page.getByText('Tên đăng nhập hoặc mật khẩu chưa đúng.')).toBeVisible()
})

test('chưa chọn bạn nào thì nút đặt mật khẩu bị khóa; "Chọn tất cả" chọn hết', async ({ page }) => {
  await openSettings(page)
  const button = region(page).getByRole('button', { name: /^Đặt mật khẩu cho/ })
  await expect(button).toBeDisabled()
  await region(page).getByRole('checkbox', { name: 'Chọn tất cả' }).check()
  await expect(pick(page, NAME)).toBeChecked()
  await expect(button).toBeEnabled()
  await region(page).getByRole('checkbox', { name: 'Chọn tất cả' }).uncheck()
  await expect(pick(page, NAME)).not.toBeChecked()
  await expect(button).toBeDisabled()
})

test('mật khẩu dưới 6 ký tự bị từ chối, vẫn chưa ai đăng nhập được', async ({ page }) => {
  await openSettings(page)
  const dialog = await setPasswordFor(page, [NAME], 'abc12')
  await expect(dialog.getByText('Mật khẩu cần ít nhất 6 ký tự.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Hủy' }).click()
  await expect(dialog).toBeHidden()
})

test('cô đặt một mật khẩu cho nhiều bạn cùng lúc: cả hai đăng nhập được, bạn không chọn thì không', async ({ page }) => {
  const other = await displayName('hs.giabao')
  const skipped = await displayName('hs.hamy')
  await openSettings(page)
  password = 'Lop58-chung'
  const dialog = await setPasswordFor(page, [NAME, other], password)
  await expect(dialog).toBeHidden()
  await expect(region(page).getByText('Đã đặt mật khẩu cho 2 bạn.')).toBeVisible()
  await expect(pick(page, skipped)).not.toBeChecked()

  await studentLogin(page, USERNAME, password)
  await expect(page).toHaveURL(/\/em$/)
  await studentLogin(page, 'hs.giabao', password)
  await expect(page).toHaveURL(/\/em$/)
  await studentLogin(page, 'hs.hamy', password)
  await expect(page.getByText('Tên đăng nhập hoặc mật khẩu chưa đúng.')).toBeVisible()
})

test('cô đặt lại mật khẩu mới cho một bạn: mật khẩu cũ hết dùng', async ({ page }) => {
  const next = 'Lop58-moi'
  await openSettings(page)
  const dialog = await setPasswordFor(page, [NAME], next)
  await expect(dialog).toBeHidden()
  await expect(region(page).getByText('Đã đặt mật khẩu cho 1 bạn.')).toBeVisible()
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
