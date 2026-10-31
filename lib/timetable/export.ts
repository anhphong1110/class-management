import * as XLSX from 'xlsx'
import { classSlug } from '@/lib/students/export'
import { PERIODS, WEEKDAY_LABELS, slotKey, weekdays } from './layout'

export function buildTimetableWorkbook(input: {
  saturday: boolean
  slots: Record<string, string | null>
  subjects: { id: string; name: string }[]
}): ArrayBuffer {
  const days = weekdays(input.saturday)
  const name = new Map(input.subjects.map((s) => [s.id, s.name]))
  const blank = (label: string) => [label, ...days.map(() => '')]
  const periodRow = (weekdaysOf: number[], session: 'morning' | 'afternoon', period: number) => [
    `Tiết ${period}`,
    ...weekdaysOf.map((d) => {
      const id = input.slots[slotKey(d, session, period)]
      return (id && name.get(id)) || ''
    }),
  ]
  const aoa = [
    ['Tiết', ...days.map((d) => WEEKDAY_LABELS[d])],
    blank('BUỔI SÁNG'),
    ...PERIODS.filter((p) => p.session === 'morning').map((p) => periodRow(days, p.session, p.period)),
    blank('BUỔI CHIỀU'),
    ...PERIODS.filter((p) => p.session === 'afternoon').map((p) => periodRow(days, p.session, p.period)),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 12 }, ...days.map(() => ({ wch: 18 }))]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Thời khóa biểu')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

export function timetableFileName(classShort: string): string {
  return `thoi-khoa-bieu-lop-${classSlug(classShort)}.xlsx`
}
