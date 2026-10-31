import { readFileSync } from 'node:fs'
import { type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.local')

type DevUser = { username: string; role: string; password: string }
const users: DevUser[] = JSON.parse(readFileSync('scripts/dev-users.json', 'utf8')).users
export const pw = (u: string) => users.find((x) => x.username === u)!.password

export const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export async function login(page: Page, tab: 'Giáo viên' | 'Học sinh', username: string) {
  await page.goto('/dang-nhap')
  await page.getByRole('tab', { name: tab }).click()
  await page.getByLabel(/Tên đăng nhập/).fill(username)
  await page.getByLabel('Mật khẩu').fill(pw(username))
  await page.getByRole('button', { name: 'Cất cánh' }).click()
}
