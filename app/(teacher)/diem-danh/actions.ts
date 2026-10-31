'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { classShortName } from '@/lib/classes/short-name'
import { classSlug } from '@/lib/students/export'
import { getStudentsWithStars } from '@/lib/stars/queries'
import { getMonth } from '@/lib/attendance/queries'
import { buildMonthCsv, type Status } from '@/lib/attendance/csv'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
// `status` luôn có mặt trên mỗi dòng (null = bỏ chọn, xóa dòng của ngày đó).
const rowsInput = z
  .array(
    z.object({
      studentId: z.guid(),
      status: z.enum(['present', 'absent_unexcused', 'absent_excused', 'late']).nullable(),
    }),
  )
  .max(100)

export async function saveAttendance(
  day: string,
  rows: { studentId: string; status: Status | null }[],
): Promise<{ error?: string; savedDate?: string }> {
  await requireTeacher()
  const d = date.safeParse(day)
  const r = rowsInput.safeParse(rows)
  if (!d.success || !r.success || Number.isNaN(Date.parse(d.data))) return { error: toVietnameseMessage('invalid_input') }
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('save_attendance', {
    p_date: d.data,
    p_rows: r.data.map((x) => ({ student_id: x.studentId, status: x.status })),
  })
  if (error) return { error: toVietnameseMessage(error.message === 'invalid_rows' ? 'invalid_input' : error.message) }
  revalidatePath('/diem-danh')
  revalidatePath('/tong-quan')
  revalidatePath('/hoc-sinh')
  return { savedDate: d.data }
}

export async function exportMonthCsv(m: string): Promise<{ error?: string; fileName?: string; csv?: string }> {
  const user = await requireTeacher()
  const parsed = month.safeParse(m)
  if (!parsed.success) return { error: toVietnameseMessage('invalid_input') }
  const supabase = await createServerSupabase()
  const [{ data: cls, error }, students, monthData] = await Promise.all([
    supabase.from('classes').select('class_name').eq('id', user.classId).single(),
    getStudentsWithStars(user.classId),
    getMonth(user.classId, parsed.data),
  ])
  if (error || !cls) return { error: toVietnameseMessage('unknown') }
  const codeById = new Map(students.map((s) => [s.id, s.code]))
  const cells: Record<string, Record<string, Status>> = {}
  for (const row of monthData.rows) {
    const c = codeById.get(row.studentId)
    if (!c) continue
    ;(cells[c] ??= {})[row.date] = row.status
  }
  const days = monthData.days.map((x) => x.date)
  const csv = buildMonthCsv(
    students.map((s) => ({ code: s.code, fullName: s.fullName })),
    days,
    cells,
  )
  return { fileName: `diem-danh-${classSlug(classShortName(cls.class_name))}-${parsed.data}.csv`, csv }
}
