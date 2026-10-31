import { writeFileSync } from 'node:fs'
import { buildTemplateWorkbook } from '../lib/students/export'

writeFileSync('public/mau/mau-danh-sach-hoc-sinh.xlsx', Buffer.from(buildTemplateWorkbook()))
console.log('Đã tạo public/mau/mau-danh-sach-hoc-sinh.xlsx')
