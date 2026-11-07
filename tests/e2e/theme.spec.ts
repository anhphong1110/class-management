import { expect, test } from '@playwright/test'
import { admin, login } from './helpers'
import { CLASS_ID } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })

async function setTheme(theme: string) {
  const { error } = await admin().from('classes').update({ theme }).eq('id', CLASS_ID)
  if (error) throw error
}
test.afterAll(() => setTheme('indigo'))

test('màu chủ đạo của lớp đổi màu nút chính "+ Thêm tiêu chí"', async ({ page }) => {
  await setTheme('mint')
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/thi-dua')
  const btn = page.getByRole('button', { name: '+ Thêm tiêu chí' }).first()
  await expect(btn).toHaveCSS('background-color', 'rgb(18, 121, 107)')

  // Modal render qua portal vào body: vẫn phải theo màu chủ đạo.
  await btn.click()
  const save = page.getByRole('dialog').getByRole('button', { name: 'Lưu tiêu chí' })
  await expect(save).toHaveCSS('background-color', 'rgb(18, 121, 107)')
  await page.keyboard.press('Escape')

  await setTheme('indigo')
  await page.reload()
  await expect(page.getByRole('button', { name: '+ Thêm tiêu chí' }).first()).toHaveCSS('background-color', 'rgb(37, 99, 235)')
})
