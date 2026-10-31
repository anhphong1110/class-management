import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { getAnnouncements } from '@/lib/announcements/queries'
import { AnnouncementsClient } from './AnnouncementsClient'

export default async function Page() {
  const user = await requireTeacher()
  const items = await getAnnouncements(user.classId, { includeArchived: false })
  return (
    <>
      <Header title="Tín hiệu từ trạm chỉ huy" subtitle="Đăng thông báo, nhắc bài, lịch kiểm tra cho lớp" />
      <AnnouncementsClient items={items} now={new Date().toISOString()} />
    </>
  )
}
