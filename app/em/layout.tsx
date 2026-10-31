import type { ReactNode } from 'react'
import { requireStudentOrTeacher } from '@/lib/auth/session'

export default async function StudentLayout({ children }: { children: ReactNode }) {
  await requireStudentOrTeacher()
  return <div className="min-h-screen bg-bg p-4 text-ink">{children}</div>
}
