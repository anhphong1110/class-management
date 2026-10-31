import { requireStudentOrTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { callName } from '@/lib/domain/name'
import { Notice } from '@/components/ui/Notice'

// Layout và page render song song; gọi lại hàm (đã cache) để page không đọc user null.
export default async function StudentHome() {
  const user = await requireStudentOrTeacher()
  const preview = user.role === 'teacher'
  let greeting = 'Xin chào!'
  if (preview) {
    const supabase = await createServerSupabase()
    const { data } = await supabase
      .from('students')
      .select('full_name')
      .eq('class_id', user.classId)
      .is('archived_at', null)
      .order('roll_no', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (data) greeting = `Xin chào, ${callName(data.full_name)}!`
  } else {
    greeting = `Xin chào, ${callName(user.displayName)}!`
  }
  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-4">
      {preview && <Notice tone="success">Cô đang xem thử giao diện học sinh.</Notice>}
      <section className="rounded-[28px] bg-gradient-to-br from-navy-to via-[#5C4FD8] to-[#9A66E6] p-8 text-white">
        <div className="text-[13px] font-extrabold tracking-[.12em] text-[#FFE08A]">
          CÙNG HỌC – CÙNG CHƠI – CÙNG TỎA SÁNG
        </div>
        <h1 className="m-0 font-display text-[40px] font-extrabold leading-[1.1]">{greeting}</h1>
      </section>
    </main>
  )
}
