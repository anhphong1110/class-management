import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { getActiveStudents, getConversationMessages, getTeacherConversations } from '@/lib/inbox/queries'
import { z } from 'zod'
import { TeacherInboxClient } from './TeacherInboxClient'

const guid = z.guid()

export default async function Page({ searchParams }: { searchParams: Promise<{ hs?: string | string[] }> }) {
  const user = await requireTeacher()
  const hs = (await searchParams).hs
  const hsId = typeof hs === 'string' && guid.safeParse(hs).success ? hs : null
  const [conversations, students, initial] = await Promise.all([
    getTeacherConversations(user.classId, 'all'),
    getActiveStudents(user.classId),
    hsId ? getConversationMessages({ studentId: hsId }) : null,
  ])
  const picked = hsId ? (conversations.find((c) => c.studentId === hsId)?.studentName ?? students.find((s) => s.id === hsId)?.name ?? null) : null
  const selected = hsId && picked && initial ? { studentId: hsId, name: picked, initial } : null
  return (
    <>
      <Header title="Hộp thư giáo viên" subtitle="Tin nhắn riêng của học sinh gửi cô" />
      <TeacherInboxClient conversations={conversations} students={students} selected={selected} />
    </>
  )
}
