import { HubFrame } from '@/components/hub/HubFrame'
import { requireStudentPage } from '@/lib/student/queries'

export default async function HubPage() {
  await requireStudentPage('hub')
  return <HubFrame />
}
