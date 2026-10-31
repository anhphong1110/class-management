'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'

type Result = { error?: string; message?: string }

// guid: `z.uuid()` của Zod 4 đòi đúng phiên bản RFC, còn id seed thì không có.
const uuid = z.guid()

export async function rewardRandom(studentId: string): Promise<Result> {
  const user = await requireTeacher()
  if (!uuid.safeParse(studentId).success) return { error: toVietnameseMessage('invalid_input') }
  const supabase = await createServerSupabase()
  const { data: settings, error: flagError } = await supabase
    .from('class_settings')
    .select('feature_random')
    .eq('class_id', user.classId)
    .maybeSingle()
  if (flagError) throw new Error(flagError.message)
  if (!(settings?.feature_random ?? true)) return { error: 'Tính năng này đang tắt. Cô bật lại trong Cài đặt.' }
  const { data: student, error: readError } = await supabase.from('students').select('full_name').eq('id', studentId).maybeSingle()
  if (readError) throw new Error(readError.message)
  if (!student) return { error: toVietnameseMessage('student_not_found') }
  const { error } = await supabase.rpc('award_stars', {
    p_student_ids: [studentId],
    p_points: 1,
    p_criterion_id: null,
    p_note: 'Gọi tên ngẫu nhiên',
  })
  if (error) return { error: toVietnameseMessage(error.message) }
  revalidatePath('/thi-dua')
  revalidatePath('/xep-hang')
  revalidatePath('/tong-quan')
  return { message: `Đã cộng 1 sao cho ${student.full_name}.` }
}
