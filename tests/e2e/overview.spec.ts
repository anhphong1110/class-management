import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { login, pw } from './helpers'
import { CLASS_ID, resetRewards, resetAttendance, resetStars, seedAttendance, seedStars, sid, sql } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan' })).toBeVisible()
}

async function teacherSession() {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const email = `co.khanh@${process.env.AUTH_EMAIL_DOMAIN ?? 'tram58.local'}`
  const { error: e1 } = await c.auth.signInWithPassword({ email, password: pw('co.khanh') })
  if (e1) throw e1
  return c
}

async function teacherAward(studentNo: number, points: number, note: string) {
  const c = await teacherSession()
  const { error } = await c.rpc('award_stars', { p_student_ids: [sid(studentNo)], p_points: points, p_criterion_id: null, p_note: note })
  if (error) throw error
}

function resetRequests() {
  sql(`delete from public.reward_requests where class_id = '${CLASS_ID}'`)
}

test.beforeEach(async () => {
  resetStars()
  resetAttendance()
  await resetRewards()
  sql(`update public.classes set cover_path = null where id = '${CLASS_ID}'`)
})
test.afterAll(async () => {
  resetStars()
  resetAttendance()
  await resetRewards()
})

test('khối chào, nút hành động và hình vẽ sẵn', async ({ page }, info) => {
  await open(page)
  await expect(page.getByRole('heading', { level: 2, name: 'Xin chào, cô Khanh!' })).toBeVisible()
  await expect(page.getByTestId('hero-art')).toBeVisible()
  await expect(page.getByTestId('hero-cover')).toHaveCount(0)
  await page.getByRole('link', { name: 'Bắt đầu điểm danh' }).click()
  await expect(page).toHaveURL(/\/diem-danh$/)
  await page.goBack()
  await page.getByRole('link', { name: 'Cộng sao cho lớp' }).click()
  await expect(page).toHaveURL(/\/thi-dua$/)
  if (info.project.name === 'desktop') {
    await page.goto('/tong-quan')
    await page.screenshot({ path: 'test-results/overview-desktop.png', fullPage: true })
  }
})

test('thao tác nhanh dẫn đúng trang', async ({ page }) => {
  await open(page)
  const qa = page.getByTestId('quick-actions')
  const links: [string, string][] = [
    ['Điểm danh', '/diem-danh'],
    ['Cộng sao', '/thi-dua'],
    ['Trừ sao', '/thi-dua?che-do=tru'],
    ['Đổi quà', '/doi-qua'],
    ['Xem bảng xếp hạng', '/xep-hang'],
  ]
  for (const [name, href] of links) await expect(qa.getByRole('link', { name, exact: true })).toHaveAttribute('href', href)
})

test('?che-do=tru mở sẵn chế độ trừ sao', async ({ page }) => {
  await open(page)
  await page.goto('/thi-dua?che-do=tru')
  await expect(page.getByRole('button', { name: 'Xác nhận trừ sao' })).toBeVisible()
})

test('thẻ số liệu: chưa điểm danh rồi có điểm danh', async ({ page }) => {
  await open(page)
  const stat = (label: string) => page.getByTestId('stat').filter({ hasText: label })
  await expect(stat('Tổng số học sinh')).toContainText('10')
  await expect(stat('Có mặt hôm nay')).toContainText('Chưa điểm danh')
  seedAttendance(1, 'present')
  seedAttendance(2, 'late')
  seedAttendance(3, 'absent_excused')
  await page.reload()
  await expect(stat('Có mặt hôm nay')).toContainText('2/10')
  await expect(stat('Có mặt hôm nay')).toContainText('1 bạn đi trễ')
  await expect(stat('Vắng hôm nay')).toContainText('vắng có phép')
})

test('cộng 2 sao: Top 3, hoạt động gần đây, thông báo rỗng', async ({ page }) => {
  await teacherAward(1, 2, 'Giúp đỡ bạn bè')
  await open(page)
  const top = page.getByTestId('top3')
  await expect(page.getByRole('heading', { name: 'Top 3 phi hành gia xuất sắc' })).toBeVisible()
  await expect(top.getByTestId('top3-card').first()).toContainText('Hạng 2')
  await expect(top.getByTestId('top3-card').filter({ hasText: 'Hạng 1' })).toContainText('Nguyễn Minh Anh')
  await expect(top.getByTestId('top3-card').filter({ hasText: 'Hạng 1' })).toContainText('2 sao')
  const act = page.getByTestId('activity').getByTestId('activity-row').first()
  await expect(act).toContainText('+2')
  await expect(act).toContainText('Nguyễn Minh Anh – Giúp đỡ bạn bè')
  await expect(act).toContainText('Cô Khanh · Vừa xong')
  await expect(page.getByText('Chưa có thông báo nào.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Xem tất cả' })).toHaveAttribute('href', '/thong-bao')
})

test('yêu cầu đổi quà chờ duyệt hiện trong hoạt động', async ({ page }) => {
  sql(`insert into public.rewards (id, class_id, name, cost, stock) values ('00000000-0000-0000-0000-0000000d9901', '${CLASS_ID}', 'Bút dễ thương', 5, 3) on conflict do nothing`)
  sql(`insert into public.reward_requests (class_id, student_id, reward_id, cost, status) values ('${CLASS_ID}', '${sid(1)}', '00000000-0000-0000-0000-0000000d9901', 5, 'pending')`)
  try {
    await open(page)
    const row = page.getByTestId('activity-row').filter({ hasText: 'gửi yêu cầu đổi' })
    await expect(row).toContainText('Nguyễn Minh Anh gửi yêu cầu đổi Bút dễ thương')
    await expect(row).toContainText('Chờ duyệt · Vừa xong')
    await expect(page.getByTestId('stat').filter({ hasText: 'Lượt đổi quà' })).toContainText('1 yêu cầu chờ duyệt')
  } finally {
    resetRequests()
    sql(`delete from public.rewards where id = '00000000-0000-0000-0000-0000000d9901'`)
  }
})

test('yêu cầu của Hà My: lượt đổi quà và hoạt động gần đây', async ({ page }) => {
  seedStars(5, 100)
  const hs = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: e1 } = await hs.auth.signInWithPassword({ email: `hs.hamy@${process.env.AUTH_EMAIL_DOMAIN ?? 'tram58.local'}`, password: pw('hs.hamy') })
  if (e1) throw e1
  for (const n of [1, 2]) {
    const { error } = await hs.rpc('request_reward', { p_reward_id: `00000000-0000-0000-0000-0000000e000${n}` })
    if (error) throw error
  }
  const { data: ids } = await hs.from('reward_requests').select('id, reward_id').eq('student_id', sid(5))
  const approve = ids!.find((r) => r.reward_id.endsWith('e0001'))!.id
  const teacher = await teacherSession()
  const { error: e3 } = await teacher.rpc('approve_reward_request', { p_request_id: approve })
  if (e3) throw e3
  await open(page)
  const stat = page.getByTestId('stat').filter({ hasText: 'Lượt đổi quà' })
  await expect(stat.locator('div.font-display')).toHaveText('1')
  await expect(stat).toContainText('1 yêu cầu chờ duyệt')
  await expect(page.getByTestId('activity-row').filter({ hasText: 'Võ Hà My gửi yêu cầu đổi Bookmark tên lửa' })).toHaveCount(1)
})

test('cộng rồi hoàn tác: thẻ sao tuần này về +0', async ({ page }) => {
  const c = await teacherSession()
  const { data: batch, error } = await c.rpc('award_stars', { p_student_ids: [sid(1)], p_points: 2, p_criterion_id: null, p_note: 'x' })
  if (error) throw error
  const { error: e2 } = await c.rpc('reverse_batch', { p_batch_id: batch })
  if (e2) throw e2
  await open(page)
  const card = page.getByTestId('stat').filter({ hasText: 'Sao thi đua tuần này' })
  await expect(card).toContainText('+0')
  await expect(card).toContainText('đã trừ 0 sao')
})

test('lớp chưa có sao: không ai đội vương miện ở Top 3', async ({ page }) => {
  await open(page)
  const crowns = page.getByTestId('top3').locator('[data-part="crown"]')
  await expect(crowns).toHaveCount(3)
  for (let i = 0; i < 3; i++) await expect(crowns.nth(i)).toHaveAttribute('opacity', '0')
})
