import { Header } from '@/components/layout/Header'
import { HubFrame } from '@/components/hub/HubFrame'
import { requireTeacher } from '@/lib/auth/session'

export default async function Page() {
  await requireTeacher()
  return (
    <>
      <Header title="Kho học liệu" subtitle="Trò chơi, sách lật và video cho cả lớp" />
      <HubFrame />
    </>
  )
}
