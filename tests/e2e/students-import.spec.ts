import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import * as XLSX from 'xlsx'
import { login } from './helpers'
import { deleteTestStudents } from './helpers/ledger'

test.describe.configure({ mode: 'serial' })
test.beforeEach(deleteTestStudents)
test.afterAll(deleteTestStudents)

async function open(page: Page) {
  await login(page, 'Giáo viên', 'co.khanh')
  await expect(page).toHaveURL(/\/tong-quan$/)
  await page.goto('/hoc-sinh')
  await expect(page.getByRole('heading', { level: 1, name: 'Quản lý học sinh' })).toBeVisible()
}

const CSV = 'Số thứ tự,Họ và tên,Mã học sinh\n11,Lý Thu Hà,\n12,,\n13,Tô Gia Huy,\n'

test('nhập CSV: xem trước, bỏ dòng lỗi, chỉ thêm dòng hợp lệ', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Nhập Excel / CSV' }).click()
  await expect(page.getByRole('link', { name: 'Tải file mẫu' })).toHaveAttribute('href', '/mau/mau-danh-sach-hoc-sinh.xlsx')
  await page.getByLabel('Chọn file danh sách').setInputFiles({ name: 'ds.csv', mimeType: 'text/csv', buffer: Buffer.from('﻿' + CSV) })
  const rows = page.getByTestId('import-row')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(1)).toHaveAttribute('data-invalid', 'true')
  await expect(rows.nth(1)).toContainText('Thiếu họ và tên')
  await expect(rows.nth(1)).toHaveCSS('background-color', 'rgb(255, 227, 234)')
  await page.getByRole('button', { name: 'Thêm 2 học sinh' }).click()
  await expect(page.getByText('Đã thêm 2 học sinh.')).toBeVisible()
  const cards = page.getByTestId('student-card')
  await expect(cards).toHaveCount(12)
  await expect(cards.filter({ hasText: 'Lý Thu Hà' })).toContainText('Mã HS11')
  await expect(cards.filter({ hasText: 'Tô Gia Huy' })).toContainText('Mã HS12')
})

test('file thiếu cột họ và tên báo lỗi', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Nhập Excel / CSV' }).click()
  await page.getByLabel('Chọn file danh sách').setInputFiles({ name: 'x.csv', mimeType: 'text/csv', buffer: Buffer.from('Mã học sinh\nHS99\n') })
  await expect(page.getByText('File thiếu cột "Họ và tên"')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thêm 0 học sinh' })).toBeDisabled()
})

test('xuất Excel tải về đúng tên và 10 dòng dữ liệu', async ({ page }) => {
  await open(page)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Xuất Excel' }).click()])
  expect(download.suggestedFilename()).toBe('danh-sach-hoc-sinh-lop-5-8.xlsx')
  const wb = XLSX.read(readFileSync((await download.path())!))
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 })
  expect(aoa[0]).toEqual(['Mã học sinh', 'Số thứ tự', 'Họ và tên', 'Tổ', 'Sao thi đua', 'Sao khả dụng'])
  expect(aoa).toHaveLength(11)
})
