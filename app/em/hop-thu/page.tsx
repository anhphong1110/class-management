import { EmptyState } from '@/components/ui/EmptyState'
import { ICONS } from '@/components/ui/Icon'
import { getShellData } from '@/lib/layout/shell-data'
import { getConversationMessages } from '@/lib/inbox/queries'
import { requireStudentPage } from '@/lib/student/queries'
import { InboxClient } from './InboxClient'

export default async function InboxPage() {
  const ctx = await requireStudentPage('inbox')
  // Giáo viên xem thử không được đọc hay gửi tin thay một em nào (đó là tin riêng của học sinh).
  if (ctx.preview || !ctx.studentId) {
    return (
      <EmptyState title="Hộp thư của em" icon={ICONS.message}>
        Đang xem thử giao diện học sinh. Ở đây các em nhắn riêng cho cô, nên cô không xem hay gửi tin ở chế độ này.
      </EmptyState>
    )
  }
  const [data, initial] = await Promise.all([getShellData(), getConversationMessages({ studentId: ctx.studentId })])
  return <InboxClient teacherName={data?.cls.teacher_name || 'cô giáo'} initial={initial} />
}
