import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { classShortName, termRoman } from './short-name'

export async function getClassHeaderInfo(classId: string) {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('classes').select('class_name, term2_start').eq('id', classId).single()
  if (error) throw new Error(error.message)
  return { short: classShortName(data.class_name), term: termRoman(data.term2_start, new Date()) }
}
