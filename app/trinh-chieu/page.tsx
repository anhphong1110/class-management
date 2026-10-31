import { requireTeacher } from '@/lib/auth/session'

export default async function Page() {
  await requireTeacher()
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-navy-from to-navy-to p-6 text-white">
      <div className="text-center">
        <h1 className="m-0 font-display text-4xl font-extrabold">Chế độ trình chiếu</h1>
        <p className="mt-2 text-[#D5D9FF]">Trang này đang được xây dựng.</p>
      </div>
    </main>
  )
}
