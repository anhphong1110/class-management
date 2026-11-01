import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolvePeriod } from '@/lib/domain/period'
import { classShortName, termRoman } from './short-name'

export async function getClassHeaderInfo(classId: string) {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('classes')
    .select('class_name, brand_title, term1_start, term1_end, term2_start, term2_end')
    .eq('id', classId)
    .single()
  if (error) throw new Error(error.message)
  const { term } = resolvePeriod('term', new Date(), {
    term1Start: data.term1_start,
    term1End: data.term1_end,
    term2Start: data.term2_start,
    term2End: data.term2_end,
  })
  return { className: data.class_name as string, brandTitle: data.brand_title as string | null, short: classShortName(data.class_name), term: termRoman(term) }
}
