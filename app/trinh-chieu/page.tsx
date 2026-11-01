import Link from 'next/link'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { getDisplayData } from '@/lib/display/queries'
import { brandLines } from '@/lib/classes/brand'
import { classShortName } from '@/lib/classes/short-name'
import { DisplayClient } from './DisplayClient'

export default async function Page() {
  const user = await requireTeacher()
  const supabase = await createServerSupabase()
  const { data: settings, error } = await supabase.from('class_settings').select('feature_display').eq('class_id', user.classId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!(settings?.feature_display ?? true)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-navy-from to-navy-to p-6 text-white">
        <div className="text-center">
          <p className="m-0 text-xl font-bold">Tính năng này đang tắt. Cô bật lại trong Cài đặt.</p>
          <Link
            href="/tong-quan"
            className="mt-5 inline-flex min-h-12 items-center rounded-[14px] border-2 border-white/60 px-5 text-base font-extrabold text-white no-underline"
          >
            Thoát trình chiếu
          </Link>
        </div>
      </main>
    )
  }
  const data = await getDisplayData(user.classId)
  return (
    <DisplayClient
      data={{ ...data, cls: { ...data.cls, className: classShortName(data.cls.className) } }}
      brand={brandLines({ class_name: data.cls.className })}
    />
  )
}
