import { expect, test } from '@playwright/test'

const GREETING = 'Mình là Bông, bạn đồng hành học tập của lớp chúng mình. Mình có thể giúp bạn gì nào?'

test.describe('Khung chat Bông (khách, trang đăng nhập)', () => {
  test('hiện ở trang đăng nhập, mở ra có lời chào và nhắc đăng nhập, khóa ô nhập', async ({ page }) => {
    await page.goto('/dang-nhap')
    const fab = page.getByRole('button', { name: 'Mở khung chat với Bông' })
    await expect(fab).toBeVisible()
    await fab.click()

    const dialog = page.getByRole('dialog', { name: 'Khung chat với Bông' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(GREETING)).toBeVisible()
    await expect(dialog.getByText('Bạn đăng nhập trước để hỏi về lịch học và sao nhé.')).toBeVisible()
    await expect(dialog.getByLabel('Câu hỏi cho Bông')).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Hôm nay học gì?' })).toHaveCount(0)
  })

  test('đóng bằng nút X và bằng phím Esc, tải lại trang vẫn giữ trạng thái đóng', async ({ page }) => {
    await page.goto('/dang-nhap')
    const dialog = page.getByRole('dialog', { name: 'Khung chat với Bông' })

    await page.getByRole('button', { name: 'Mở khung chat với Bông' }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Đóng khung chat' }).click()
    await expect(dialog).toBeHidden()

    await page.getByRole('button', { name: 'Mở khung chat với Bông' }).click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await page.reload()
    await expect(page.getByRole('button', { name: 'Mở khung chat với Bông' })).toBeVisible()
    await expect(dialog).toBeHidden()
  })

  test('nút robot có mặt cả ở trang không tồn tại (404)', async ({ page }) => {
    await page.goto('/khong-co-trang-nay')
    // Khách bị đưa về trang đăng nhập; khung chat vẫn còn ở đó.
    await expect(page.getByRole('button', { name: /khung chat với Bông/ })).toBeVisible()
  })

  test('API từ chối khách hỏi khi chưa đăng nhập', async ({ request }) => {
    const res = await request.post('/api/chat', { data: { message: 'hôm nay học gì' } })
    expect(res.status()).toBe(401)
  })
})
