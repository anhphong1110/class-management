import { requireStudent } from '@/lib/auth/session'
import { callName } from '@/lib/domain/name'

export default async function StudentHome() {
  const user = await requireStudent()
  return (
    <main className="mx-auto max-w-[1000px]">
      <section className="rounded-[28px] bg-gradient-to-br from-navy-to via-[#5C4FD8] to-[#9A66E6] p-8 text-white">
        <div className="text-[13px] font-extrabold tracking-[.12em] text-[#FFE08A]">
          CÙNG HỌC – CÙNG CHƠI – CÙNG TỎA SÁNG
        </div>
        <h1 className="m-0 font-display text-[40px] font-extrabold leading-[1.1]">
          Xin chào, {callName(user.displayName)}!
        </h1>
      </section>
    </main>
  )
}
