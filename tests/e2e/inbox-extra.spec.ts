import { readFileSync } from 'node:fs'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID } from './helpers/ledger'

// Bổ sung cho inbox.spec.ts. Chạy tuần tự trên cùng một lớp seed (workers: 1).
// Giới hạn chống spam là 5 tin / 30 giây / tài khoản, nên các test gửi qua giao diện chỉ gửi vài tin,
// còn test cần nhiều tin thì ghi thẳng bằng service role.
test.describe.configure({ mode: 'serial' })

const STUDENT = 'hs.hamy'
const OTHER_STUDENT = 'hs.minhanh'
const TEACHER2 = 'co.thu2.e2e'
const msgs = (page: Page) => page.getByTestId('chat-message')
const input = (page: Page) => page.getByTestId('chat-input')
const sendBtn = (page: Page) => page.getByTestId('chat-send')

let studentId = ''
let otherStudentId = ''
let ctxs: BrowserContext[] = []
let teacher2Id: string | null = null

async function newPage(browser: Browser) {
  const ctx = await browser.newContext()
  ctxs.push(ctx)
  return ctx.newPage()
}

async function resetInbox() {
  const db = admin()
  const a = await db.from('messages').delete().eq('class_id', CLASS_ID)
  expect(a.error).toBeNull()
  const b = await db.from('conversations').delete().eq('class_id', CLASS_ID)
  expect(b.error).toBeNull()
}

async function studentOn(browser: Browser, path = '/em/hop-thu', username = STUDENT) {
  const page = await newPage(browser)
  await login(page, 'Học sinh', username)
  await expect(page).toHaveURL(/\/em$/)
  if (path !== '/em') await page.goto(path)
  return page
}

async function teacherOn(browser: Browser, path = '/hop-thu', username = 'co.khanh') {
  const page = await newPage(browser)
  await login(page, 'Giáo viên', username)
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  return page
}

async function say(page: Page, text: string) {
  await input(page).fill(text)
  await sendBtn(page).click()
}

/** Tạo một cuộc hội thoại kèm `count` tin (cách nhau 1 giây, cũ → mới) bằng service role. Trả conversation id. */
async function seedConversation(forStudent: string, count: number, prefix = 'Tin số') {
  const db = admin()
  const conv = await db.from('conversations').insert({ class_id: CLASS_ID, student_id: forStudent }).select('id').single()
  expect(conv.error).toBeNull()
  const base = Date.now() - 3_600_000
  const rows = Array.from({ length: count }, (_, i) => ({
    class_id: CLASS_ID,
    conversation_id: conv.data!.id,
    sender_role: i % 2 === 0 ? 'student' : 'teacher',
    sender_id: null,
    body: `${prefix} ${i + 1}`,
    client_id: crypto.randomUUID(),
    created_at: new Date(base + i * 1000).toISOString(),
    read_at: new Date(base + i * 1000).toISOString(),
  }))
  const ins = await db.from('messages').insert(rows)
  expect(ins.error).toBeNull()
  const upd = await db
    .from('conversations')
    .update({ last_message_at: rows[count - 1].created_at, last_sender_role: rows[count - 1].sender_role })
    .eq('id', conv.data!.id)
  expect(upd.error).toBeNull()
  return conv.data!.id as string
}

async function createTeacher2() {
  const db = admin()
  const email = `${TEACHER2}@${process.env.AUTH_EMAIL_DOMAIN ?? 'tram58.local'}`
  const password = `E2e-${crypto.randomUUID()}`
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true })
  expect(error).toBeNull()
  teacher2Id = data.user!.id
  const prof = await db
    .from('profiles')
    .insert({ id: teacher2Id, class_id: CLASS_ID, role: 'teacher', username: TEACHER2, display_name: 'Cô phụ e2e' })
  expect(prof.error).toBeNull()
  return password
}

async function deleteTeacher2() {
  if (!teacher2Id) return
  const db = admin()
  await db.from('profiles').delete().eq('id', teacher2Id)
  await db.auth.admin.deleteUser(teacher2Id)
  teacher2Id = null
}

test.beforeAll(async () => {
  const db = admin()
  const { data: p, error: pe } = await db.from('profiles').select('student_id').eq('username', STUDENT).single()
  expect(pe).toBeNull()
  studentId = p!.student_id!
  const { data: o, error: oe } = await db.from('profiles').select('student_id').eq('username', OTHER_STUDENT).single()
  expect(oe).toBeNull()
  otherStudentId = o!.student_id!
})

test.beforeEach(async () => {
  await resetInbox()
})

test.afterEach(async () => {
  await Promise.all(ctxs.map((c) => c.close().catch(() => {})))
  ctxs = []
  await deleteTeacher2()
})

test.afterAll(async () => {
  await resetInbox()
})

test('cô xem thử giao diện học sinh: /em/hop-thu chỉ có thông báo, không có ô nhập để gửi', async ({ browser }) => {
  const teacher = await newPage(browser)
  await login(teacher, 'Giáo viên', 'co.khanh')
  await expect(teacher).toHaveURL(/\/tong-quan$/)
  await teacher.goto('/em/hop-thu')
  await expect(teacher.getByText('Đang xem thử giao diện học sinh.', { exact: false })).toBeVisible()
  await expect(teacher.getByText('nên cô không xem hay gửi tin ở chế độ này', { exact: false })).toBeVisible()
  await expect(input(teacher)).toHaveCount(0)
  await expect(sendBtn(teacher)).toHaveCount(0)

  const { count } = await admin().from('messages').select('id', { count: 'exact', head: true }).eq('class_id', CLASS_ID)
  expect(count).toBe(0)
})

test('hai cô cùng lớp cùng thấy và cùng trả lời một hội thoại', async ({ browser }) => {
  const password = await createTeacher2()
  const student = await studentOn(browser)
  await say(student, 'Em hỏi bài tập ạ')
  await expect(msgs(student)).toHaveCount(1)
  await expect(student.getByTestId('chat-status')).toContainText('Đã gửi')

  const t1 = await teacherOn(browser, `/hop-thu?hs=${studentId}`)
  const t2 = await newPage(browser)
  await t2.goto('/dang-nhap')
  await t2.getByRole('tab', { name: 'Giáo viên' }).click()
  await t2.getByLabel(/Tên đăng nhập/).fill(TEACHER2)
  await t2.getByLabel('Mật khẩu').fill(password)
  await t2.getByRole('button', { name: 'Cất cánh' }).click()
  await expect(t2).toHaveURL(/\/tong-quan$/)
  await t2.goto(`/hop-thu?hs=${studentId}`)

  await expect(msgs(t1)).toHaveCount(1)
  await expect(msgs(t2)).toHaveCount(1)
  await expect(msgs(t2).first()).toContainText('Em hỏi bài tập ạ')

  await say(t1, 'Cô Khanh trả lời trước')
  await expect(msgs(t1)).toHaveCount(2)
  // Cô thứ hai thấy tin của cô thứ nhất live, rồi trả lời tiếp trong cùng luồng.
  await expect(msgs(t2)).toHaveCount(2, { timeout: 15_000 })
  await say(t2, 'Cô phụ bổ sung thêm')
  await expect(msgs(t2)).toHaveCount(3)
  await expect(msgs(t1)).toHaveCount(3, { timeout: 15_000 })
  await expect(msgs(student)).toHaveCount(3, { timeout: 15_000 })

  const { data } = await admin().from('conversations').select('id').eq('class_id', CLASS_ID)
  expect(data).toHaveLength(1)
})

test('khung chat của cô đang mở cập nhật ngay khi học sinh gửi, không tải lại', async ({ browser }) => {
  const teacher = await teacherOn(browser, `/hop-thu?hs=${studentId}`)
  await expect(msgs(teacher)).toHaveCount(0)
  const student = await studentOn(browser)
  await say(student, 'Tin đầu tiên')
  await expect(msgs(teacher)).toHaveCount(1, { timeout: 15_000 })
  await say(student, 'Tin thứ hai')
  await expect(msgs(teacher)).toHaveCount(2, { timeout: 15_000 })
  await expect(msgs(teacher).last()).toContainText('Tin thứ hai')
})

test('đăng xuất rồi đăng nhập lại vẫn còn lịch sử, cả hai phía', async ({ browser }) => {
  const student = await studentOn(browser)
  await say(student, 'Lịch sử cần giữ')
  await expect(student.getByTestId('chat-status')).toContainText('Đã gửi')
  const teacher = await teacherOn(browser, `/hop-thu?hs=${studentId}`)
  await say(teacher, 'Cô đã nhận')
  await expect(msgs(teacher)).toHaveCount(2)

  await student.context().clearCookies()
  await student.goto('/em/hop-thu')
  await expect(student).toHaveURL(/dang-nhap/)
  await login(student, 'Học sinh', STUDENT)
  await expect(student).toHaveURL(/\/em$/)
  await student.goto('/em/hop-thu')
  await expect(msgs(student)).toHaveCount(2)
  await expect(msgs(student).first()).toContainText('Lịch sử cần giữ')

  await teacher.context().clearCookies()
  await teacher.goto('/hop-thu')
  await expect(teacher).toHaveURL(/dang-nhap/)
  await login(teacher, 'Giáo viên', 'co.khanh')
  await expect(teacher).toHaveURL(/\/tong-quan$/)
  await teacher.goto(`/hop-thu?hs=${studentId}`)
  await expect(msgs(teacher)).toHaveCount(2)
  await expect(msgs(teacher).last()).toContainText('Cô đã nhận')
})

test('chống spam: tin thứ 6 trong 30 giây hiện lỗi thân thiện và không được lưu', async ({ browser }) => {
  const student = await studentOn(browser)
  for (let i = 1; i <= 5; i++) {
    await say(student, `Tin ${i}`)
    await expect(msgs(student)).toHaveCount(i)
    await expect(msgs(student).last().getByTestId('chat-status')).toContainText('Đã gửi')
  }
  await say(student, 'Tin thứ sáu')
  await expect(student.getByText('Nhắn nhanh quá rồi, chờ một lát rồi gửi tiếp nhé.')).toBeVisible()
  await expect(msgs(student).last().getByTestId('chat-status')).toContainText('Chưa gửi được')

  const { count } = await admin().from('messages').select('id', { count: 'exact', head: true }).eq('class_id', CLASS_ID)
  expect(count).toBe(5)
})

test('phân trang: 60 tin thì hiện 50 tin mới nhất, "Xem tin cũ hơn" tải nốt 10 tin cũ', async ({ browser }) => {
  await seedConversation(studentId, 60)
  const student = await studentOn(browser)
  await expect(msgs(student)).toHaveCount(50)
  await expect(msgs(student).first()).toContainText('Tin số 11')
  await expect(msgs(student).last()).toContainText('Tin số 60')
  const more = student.getByRole('button', { name: 'Xem tin cũ hơn' })
  await expect(more).toBeVisible()
  // Bấm lại nếu trang chưa hydrate xong (nút có từ HTML máy chủ trước khi React gắn sự kiện).
  await expect(async () => {
    if (await more.count()) await more.click()
    await expect(msgs(student)).toHaveCount(60, { timeout: 3_000 })
  }).toPass({ timeout: 20_000 })
  await expect(msgs(student).first()).toContainText('Tin số 1')
  await expect(more).toHaveCount(0)

  // Phía cô cũng phân trang như vậy.
  const teacher = await teacherOn(browser, `/hop-thu?hs=${studentId}`)
  await expect(msgs(teacher)).toHaveCount(50)
  const tMore = teacher.getByRole('button', { name: 'Xem tin cũ hơn' })
  await expect(async () => {
    if (await tMore.count()) await tMore.click()
    await expect(msgs(teacher)).toHaveCount(60, { timeout: 3_000 })
  }).toPass({ timeout: 20_000 })
})

test('danh sách của cô: rỗng thì hiện "Chưa có tin nhắn nào."; các bộ lọc Tất cả / Chưa đọc / Chờ phản hồi lọc đúng', async ({ browser }) => {
  const teacher = await teacherOn(browser)
  const list = teacher.locator('#inbox-list')
  await expect(list.getByText('Chưa có tin nhắn nào.')).toBeVisible()
  await expect(teacher.getByTestId('inbox-conversation')).toHaveCount(0)

  // A (hs.hamy): học sinh nhắn sau cùng, chưa đọc → chờ phản hồi và chưa đọc.
  // B (hs.minhanh): cô trả lời sau cùng, các tin đã đọc → không chờ, không chưa đọc.
  const db = admin()
  const aId = await seedConversation(studentId, 3, 'A')
  const bId = await seedConversation(otherStudentId, 2, 'B')
  const lastA = await db.from('messages').select('id').eq('conversation_id', aId).order('created_at', { ascending: false }).limit(1).single()
  const unread = await db.from('messages').update({ read_at: null }).eq('id', lastA.data!.id)
  expect(unread.error).toBeNull()
  expect(bId).toBeTruthy()

  await teacher.reload()
  const items = teacher.getByTestId('inbox-conversation')
  const tab = (name: string) => teacher.getByRole('tab', { name })
  await expect(items).toHaveCount(2)

  await tab('Chưa đọc').click()
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('A 3')

  await tab('Chờ phản hồi').click()
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('A 3')

  await tab('Tất cả').click()
  await expect(items).toHaveCount(2)

  // Cô trả lời A thì A hết "chờ phản hồi" và hết "chưa đọc" sau khi mở.
  await items.first().click()
  await expect(msgs(teacher).last()).toContainText('A 3')
  await say(teacher, 'Cô trả lời A')
  await expect(msgs(teacher)).toHaveCount(4)
  await expect(msgs(teacher).last().getByTestId('chat-status')).toContainText('Đã gửi')
  await teacher.goto('/hop-thu')
  await tab('Chờ phản hồi').click()
  await expect(list.getByText('Chưa có tin nhắn nào.')).toBeVisible()
  await tab('Chưa đọc').click()
  await expect(list.getByText('Chưa có tin nhắn nào.')).toBeVisible()
})

test('bản sao lưu có chứa hội thoại và tin nhắn', async ({ browser }) => {
  await seedConversation(studentId, 3, 'Sao lưu')
  const teacher = await teacherOn(browser, '/cai-dat')
  const waiting = teacher.waitForEvent('download')
  await teacher.getByRole('link', { name: /Sao lưu dữ liệu/ }).click()
  const download = await waiting
  const json = JSON.parse(readFileSync((await download.path())!, 'utf8'))
  expect(json.tables.conversations).toHaveLength(1)
  expect(json.tables.messages).toHaveLength(3)
  expect(json.tables.messages.map((m: { body: string }) => m.body).sort()).toEqual(['Sao lưu 1', 'Sao lưu 2', 'Sao lưu 3'])
})
