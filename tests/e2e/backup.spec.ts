import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

const INVALID = 'File sao lưu không hợp lệ.'

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/cai-dat')
  await expect(page.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Năm học và dữ liệu' })).toBeVisible()
}

async function expectClassUnchanged(page: Page) {
  const db = admin()
  const { data, error } = await db.from('profiles').select('class_id').eq('username', 'co.khanh').single()
  expect(error).toBeNull()
  expect(data?.class_id).toBe(CLASS_ID)
  const { count } = await db.from('classes').select('id', { count: 'exact', head: true })
  expect(count).toBe(classCount)
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

let classCount = -1

test.beforeAll(async () => {
  const { count } = await admin().from('classes').select('id', { count: 'exact', head: true })
  classCount = count ?? -1
})

test('"Sao lưu dữ liệu" tải được file JSON có format', async ({ page }) => {
  await open(page)
  const waiting = page.waitForEvent('download')
  await page.getByRole('link', { name: /Sao lưu dữ liệu/ }).click()
  const download = await waiting
  expect(download.suggestedFilename()).toMatch(/^tram-sao-luu-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.json$/)
  const json = JSON.parse(readFileSync((await download.path())!, 'utf8'))
  expect(json.format).toBe('tram-khong-gian-backup')
  expect(json.version).toBe(1)
  expect(json.class.id).toBe(CLASS_ID)
  expect(json.tables.students.length).toBeGreaterThan(0)
  expect(json.tables).not.toHaveProperty('profiles')
  expect(json.tables).not.toHaveProperty('audit_logs')
})

test('route sao lưu: lop không phải GUID là 400, lớp của người khác là 403', async ({ page }) => {
  await open(page)
  expect((await page.request.get('/cai-dat/sao-luu?lop=abc')).status()).toBe(400)
  expect((await page.request.get('/cai-dat/sao-luu?lop=00000000-0000-0000-0000-00000000dead')).status()).toBe(403)
  const ok = await page.request.get(`/cai-dat/sao-luu?lop=${CLASS_ID}`)
  expect(ok.status()).toBe(200)
  expect(ok.headers()['content-disposition']).toContain('attachment')
})

test('học sinh không tải được bản sao lưu', async ({ page }) => {
  await login(page, 'Học sinh', 'hs.minhanh')
  await expect(page).toHaveURL(/\/em/)
  // Middleware đưa học sinh về /em; nếu lọt tới route thì route cũng trả 403. Cả hai đều không có dữ liệu.
  const res = await page.request.get('/cai-dat/sao-luu', { maxRedirects: 0 })
  expect([307, 403]).toContain(res.status())
  expect(await res.text()).not.toContain('tram-khong-gian-backup')
})

test('file không phải bản sao lưu, sai phiên bản hoặc JSON hỏng: báo lỗi và lớp vẫn như cũ', async ({ page }) => {
  await open(page)
  const input = page.getByTestId('restore-file')
  const files: Record<string, string> = {
    'a.json': '{"a":1}',
    'v2.json': JSON.stringify({ format: 'tram-khong-gian-backup', version: 2, class: {}, tables: {} }),
    'hong.json': '{"format": ',
  }
  for (const [name, body] of Object.entries(files)) {
    await input.setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(body) })
    await expect(page.getByRole('alert').filter({ hasText: INVALID })).toBeVisible()
    await expectClassUnchanged(page)
  }
})

test('file hợp lệ: xem trước tên lớp, năm học, số học sinh và số giao dịch sao, rồi Hủy thì không đổi gì', async ({ page }) => {
  await open(page)
  const waiting = page.waitForEvent('download')
  await page.getByRole('link', { name: /Sao lưu dữ liệu/ }).click()
  const download = await waiting
  const path = (await download.path())!
  const json = JSON.parse(readFileSync(path, 'utf8'))

  await page.getByTestId('restore-file').setInputFiles(path)
  const dialog = page.getByRole('dialog', { name: 'Khôi phục từ bản sao lưu' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(json.class.class_name)
  await expect(dialog).toContainText(json.class.school_year)
  await expect(dialog.getByText('Số học sinh').locator('xpath=following-sibling::dd[1]')).toHaveText(String(json.tables.students.length))
  await expect(dialog.getByText('Số giao dịch sao').locator('xpath=following-sibling::dd[1]')).toHaveText(String(json.tables.star_transactions.length))
  await expect(dialog).toContainText(
    'Khôi phục sẽ tạo một năm học mới từ bản sao lưu và lưu trữ năm học hiện tại. Dữ liệu hiện tại không bị xóa. Học sinh cần được tạo lại tài khoản.',
  )
  await expect(dialog.getByRole('button', { name: 'Khôi phục' })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Hủy' }).click()
  await expectClassUnchanged(page)
})

test('file đúng hình dạng nhưng cơ sở dữ liệu từ chối: báo lỗi, lớp vẫn như cũ, file tạm bị xóa', async ({ page }) => {
  await open(page)
  const waiting = page.waitForEvent('download')
  await page.getByRole('link', { name: /Sao lưu dữ liệu/ }).click()
  const json = JSON.parse(readFileSync((await (await waiting).path())!, 'utf8'))
  // Học sinh đầu tiên trỏ tới một avatar không có: qua kiểm hình dạng ở trình duyệt, vướng khóa ngoại trong DB.
  json.tables.students[0].avatar_id = '00000000-0000-0000-0000-00000000dead'

  await page.getByTestId('restore-file').setInputFiles({ name: 'chet.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) })
  const dialog = page.getByRole('dialog', { name: 'Khôi phục từ bản sao lưu' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Khôi phục' }).click()
  await expect(page.getByRole('alert').filter({ hasText: INVALID })).toBeVisible()
  await expectClassUnchanged(page)
  const { data } = await admin().storage.from('class-backups').list(CLASS_ID)
  expect((data ?? []).filter((f) => !f.name.startsWith('export-'))).toHaveLength(0)
})
