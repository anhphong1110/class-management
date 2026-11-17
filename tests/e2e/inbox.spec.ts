import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

const STUDENT = 'hs.hamy'
const msgs = (page: Page) => page.getByTestId('chat-message')
const input = (page: Page) => page.getByTestId('chat-input')
const sendBtn = (page: Page) => page.getByTestId('chat-send')
const badge = (page: Page) => page.getByTestId('inbox-badge-count')

let studentId = ''
let originalFlag = true
let ctxs: BrowserContext[] = []

async function newPage(browser: Browser) {
  const ctx = await browser.newContext()
  ctxs.push(ctx)
  return ctx.newPage()
}

/** Xóa tin và hội thoại của lớp (bảng chỉ ghi qua RPC nên dọn bằng service role). */
async function resetInbox() {
  const db = admin()
  const a = await db.from('messages').delete().eq('class_id', CLASS_ID)
  expect(a.error).toBeNull()
  const b = await db.from('conversations').delete().eq('class_id', CLASS_ID)
  expect(b.error).toBeNull()
}

/** Chờ cờ trong DB đổi (thông báo "Đã lưu" của lần bấm trước có thể còn hiện, nên không dựa vào nó). */
async function expectFlag(value: boolean) {
  await expect
    .poll(async () => (await admin().from('class_settings').select('student_can_message').eq('class_id', CLASS_ID).single()).data?.student_can_message)
    .toBe(value)
}

async function setFlag(value: boolean) {
  const { error } = await admin().from('class_settings').update({ student_can_message: value }).eq('class_id', CLASS_ID)
  expect(error).toBeNull()
}

async function studentOn(browser: Browser, path = '/em') {
  const page = await newPage(browser)
  await login(page, 'Học sinh', STUDENT)
  await expect(page).toHaveURL(/\/em$/)
  if (path !== '/em') await page.goto(path)
  return page
}

async function teacherOn(browser: Browser, path = '/hop-thu') {
  const page = await newPage(browser)
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  return page
}

/** Dưới lg các mục sau cùng nằm trong bảng "Thêm". */
async function showAllLinks(page: Page) {
  const more = page.getByRole('navigation', { name: 'Menu học sinh' }).getByRole('button', { name: 'Thêm' })
  if (await more.isVisible()) await more.click()
}

async function say(page: Page, text: string) {
  await input(page).fill(text)
  await sendBtn(page).click()
}

test.beforeAll(async () => {
  const db = admin()
  const { data, error } = await db.from('class_settings').select('student_can_message').eq('class_id', CLASS_ID).single()
  expect(error).toBeNull()
  originalFlag = data!.student_can_message
  const { data: p, error: pe } = await db.from('profiles').select('student_id').eq('username', STUDENT).single()
  expect(pe).toBeNull()
  studentId = p!.student_id!
})

test.beforeEach(async () => {
  await setFlag(true)
  await resetInbox()
})

test.afterEach(async () => {
  await Promise.all(ctxs.map((c) => c.close().catch(() => {})))
  ctxs = []
})

test.afterAll(async () => {
  await resetInbox()
  await setFlag(originalFlag)
})

test('học sinh gửi tin: huy hiệu cô tăng không cần tải lại, mở hội thoại thì về 0, bong bóng hiện "Đã đọc"', async ({ browser }) => {
  const teacher = await teacherOn(browser)
  await expect(badge(teacher)).toHaveCount(0)

  const student = await studentOn(browser, '/em/hop-thu')
  await say(student, 'Cô ơi em xin nghỉ ngày mai ạ')
  await expect(msgs(student)).toHaveCount(1)
  await expect(msgs(student).first()).toContainText('Cô ơi em xin nghỉ ngày mai ạ')
  await expect(student.getByTestId('chat-status')).toContainText('Đã gửi')

  // Cô chưa tải lại trang: huy hiệu phải tự tăng qua Realtime.
  await expect(badge(teacher)).toHaveText('1', { timeout: 15_000 })
  const item = teacher.getByTestId('inbox-conversation').first()
  await expect(item).toContainText('Cô ơi em xin nghỉ ngày mai ạ')
  await expect(item).toContainText('Chờ phản hồi')

  await item.click()
  await expect(teacher.getByTestId('inbox-chat-title')).toBeVisible()
  await expect(msgs(teacher)).toHaveCount(1)
  await expect(badge(teacher)).toHaveCount(0, { timeout: 15_000 })

  // Học sinh thấy tin của mình đã được cô đọc, không cần tải lại.
  await expect(student.getByTestId('chat-status')).toContainText('Đã đọc', { timeout: 15_000 })
})

test('cô trả lời: học sinh thấy ngay, huy hiệu học sinh tăng rồi hết khi vào hộp thư; lịch sử còn sau khi tải lại và đăng nhập lại', async ({ browser }) => {
  // Học sinh gửi trước để có hội thoại, rồi ở lại trang chủ /em.
  const first = await studentOn(browser, '/em/hop-thu')
  await say(first, 'Em chào cô ạ')
  await expect(msgs(first)).toHaveCount(1)
  await expect(first.getByTestId('chat-status')).toContainText('Đã gửi')

  const student = await studentOn(browser)
  await expect(badge(student)).toHaveCount(0)

  const teacher = await teacherOn(browser, `/hop-thu?hs=${studentId}`)
  await expect(msgs(teacher)).toHaveCount(1)
  await say(teacher, 'Cô chào em, cô đã nhận được tin')
  await expect(msgs(teacher)).toHaveCount(2)

  await expect(badge(student)).toHaveText('1', { timeout: 15_000 })
  await badge(student).click()
  await expect(student).toHaveURL(/\/em\/hop-thu$/)
  await expect(msgs(student)).toHaveCount(2)
  await expect(msgs(student).last()).toContainText('Cô chào em, cô đã nhận được tin')
  await expect(badge(student)).toHaveCount(0, { timeout: 15_000 })

  // Khi học sinh đang mở hộp thư, tin mới của cô hiện live và không để lại huy hiệu.
  await say(teacher, 'Em nhớ mang vở nhé')
  await expect(msgs(student)).toHaveCount(3, { timeout: 15_000 })
  await expect(msgs(student).last()).toContainText('Em nhớ mang vở nhé')
  await expect(badge(student)).toHaveCount(0)
  await expect(teacher.getByTestId('chat-status').last()).toContainText('Đã đọc', { timeout: 15_000 })

  // Lịch sử còn nguyên sau khi tải lại.
  await student.reload()
  await expect(msgs(student)).toHaveCount(3)
  await teacher.reload()
  await expect(msgs(teacher)).toHaveCount(3)

  // Và sau khi đăng nhập lại bằng phiên mới.
  const again = await studentOn(browser, '/em/hop-thu')
  await expect(msgs(again)).toHaveCount(3)
  await expect(msgs(again).first()).toContainText('Em chào cô ạ')
})

test('gửi tin rỗng bị chặn; tin quá 2000 ký tự bị chặn', async ({ browser }) => {
  const student = await studentOn(browser, '/em/hop-thu')
  await expect(sendBtn(student)).toBeDisabled()
  await input(student).fill('   ')
  await expect(sendBtn(student)).toBeDisabled()
  await input(student).press('Enter')
  await expect(msgs(student)).toHaveCount(0)

  await input(student).fill('a'.repeat(2001))
  await expect(sendBtn(student)).toBeDisabled()
  await expect(student.getByTestId('chat-counter')).toContainText('dài quá')
  await input(student).press('Enter')
  await expect(msgs(student)).toHaveCount(0)

  // Đúng 2000 ký tự thì gửi được.
  await input(student).fill('b'.repeat(2000))
  await expect(sendBtn(student)).toBeEnabled()
  await sendBtn(student).click()
  await expect(msgs(student)).toHaveCount(1)
  await expect(student.getByTestId('chat-status')).toContainText('Đã gửi')

  const { count } = await admin().from('messages').select('id', { count: 'exact', head: true }).eq('class_id', CLASS_ID)
  expect(count).toBe(1)
})

test('cô tắt "Học sinh được nhắn tin cho cô": mục menu biến mất, /em/hop-thu 404; bật lại thì trở lại', async ({ browser }) => {
  try {
    const teacher = await teacherOn(browser, '/cai-dat')
    const sw = teacher.getByRole('switch', { name: 'Học sinh được nhắn tin cho cô' })
    await expect(sw).toHaveAttribute('aria-checked', 'true')

    const student = await studentOn(browser)
    const nav = student.getByRole('navigation', { name: 'Menu học sinh' })
    await showAllLinks(student)
    await expect(nav.getByRole('link', { name: /Hộp thư/ }).first()).toBeVisible()
    expect((await student.goto('/em/hop-thu'))?.status()).toBe(200)

    await sw.click()
    await expect(teacher.getByRole('status').filter({ hasText: 'Đã lưu cài đặt.' })).toBeVisible()
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await expectFlag(false)

    expect((await student.goto('/em/hop-thu'))?.status()).toBe(404)
    await student.goto('/em')
    await showAllLinks(student)
    await expect(student.getByRole('navigation', { name: 'Menu học sinh' }).getByRole('link', { name: /Hộp thư/ })).toHaveCount(0)

    await sw.click()
    await expect(teacher.getByRole('status').filter({ hasText: 'Đã lưu cài đặt.' })).toBeVisible()
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    await expectFlag(true)
    expect((await student.goto('/em/hop-thu'))?.status()).toBe(200)
  } finally {
    await setFlag(true)
  }
})

test('màn hình nhỏ: học sinh và cô gửi tin được', async ({ browser }) => {
  const small = { viewport: { width: 375, height: 812 } }
  const sctx = await browser.newContext(small)
  const tctx = await browser.newContext(small)
  ctxs.push(sctx, tctx)
  const student = await sctx.newPage()
  await login(student, 'Học sinh', STUDENT)
  await expect(student).toHaveURL(/\/em$/)
  await student.goto('/em/hop-thu')
  await say(student, 'Em gửi từ điện thoại ạ')
  await expect(msgs(student)).toHaveCount(1)
  await expect(student.getByTestId('chat-status')).toContainText('Đã gửi')

  const teacher = await tctx.newPage()
  await login(teacher, 'Giáo viên', 'co.khanh')
  await expect(teacher).toHaveURL(/\/tong-quan$/)
  await teacher.goto(`/hop-thu?hs=${studentId}`)
  await expect(msgs(teacher)).toHaveCount(1)
  await say(teacher, 'Cô nhận rồi nhé')
  await expect(msgs(teacher)).toHaveCount(2)
  await expect(msgs(student)).toHaveCount(2, { timeout: 15_000 })
  const noOverflow = await student.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(noOverflow).toBe(true)
})
