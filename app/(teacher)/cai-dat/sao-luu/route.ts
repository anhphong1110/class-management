import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { backupFileName } from '@/lib/backup/filename'

const guid = z.guid()

/** Route handler không đi qua layout nên tự kiểm đăng nhập và vai giáo viên. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  if (user.role !== 'teacher') return new NextResponse('Forbidden', { status: 403 })

  const raw = request.nextUrl.searchParams.get('lop')
  const classId = raw === null ? user.classId : raw
  if (!guid.safeParse(classId).success) return new NextResponse('Bad Request', { status: 400 })

  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('export_class_backup', { p_class_id: classId })
  if (error) {
    if (error.message === 'not_allowed') return new NextResponse('Forbidden', { status: 403 })
    throw new Error(error.message)
  }

  const className = typeof (data as { class?: { class_name?: unknown } })?.class?.class_name === 'string'
    ? (data as { class: { class_name: string } }).class.class_name
    : ''
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  return new NextResponse(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${backupFileName(className, today)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
