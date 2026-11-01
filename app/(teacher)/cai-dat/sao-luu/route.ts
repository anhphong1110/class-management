import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { backupFileName } from '@/lib/backup/filename'
import { BACKUP_BUCKET } from '@/lib/backup/format'

const guid = z.guid()

const EXPORT_ERROR = 'Không tạo được bản sao lưu. Cô thử lại sau nhé.'

/** Trang lỗi thân thiện (thay cho trang 500 mặc định) kèm liên kết quay về Cài đặt. */
function exportFailed() {
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sao lưu</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#F4F6FF;color:#1F2250"><main style="max-width:420px;padding:24px;text-align:center"><p style="font-size:18px;font-weight:700">${EXPORT_ERROR}</p><a href="/cai-dat" style="color:#4B4FB5;font-weight:700">Quay lại Cài đặt</a></main></body></html>`
  return new NextResponse(html, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

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
    console.error('sao lưu: export_class_backup lỗi:', error.message)
    return exportFailed()
  }

  const className = typeof (data as { class?: { class_name?: unknown } })?.class?.class_name === 'string'
    ? (data as { class: { class_name: string } }).class.class_name
    : ''
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())

  // Vercel giới hạn thân phản hồi 4,5 MB: đưa file lên Storage rồi chuyển tới đường dẫn ký sẵn (60 giây) có tên tải về.
  // Thư mục là lớp hiện tại của giáo viên (xuất lớp đã lưu trữ cũng lưu ở đây).
  const store = supabase.storage.from(BACKUP_BUCKET)
  const path = `${user.classId}/export-${crypto.randomUUID()}.json`
  const up = await store.upload(path, Buffer.from(JSON.stringify(data)), { contentType: 'application/json' })
  if (up.error) {
    console.error('sao lưu: không tải file lên Storage:', up.error.message)
    return exportFailed()
  }

  // Dọn file tạm cũ hơn 1 ngày (cơ hội, mỗi lần xuất); lỗi dọn không làm hỏng lần xuất này.
  try {
    const { data: files } = await store.list(user.classId, { limit: 100 })
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const stale = (files ?? []).filter((f) => f.created_at && Date.parse(f.created_at) < cutoff).map((f) => `${user.classId}/${f.name}`)
    if (stale.length > 0) await store.remove(stale)
  } catch (e) {
    console.error('sao lưu: không dọn được file tạm cũ:', e)
  }

  const { data: signed, error: signError } = await store.createSignedUrl(path, 60, { download: backupFileName(className, today) })
  if (signError || !signed) {
    console.error('sao lưu: không ký được liên kết tải:', signError?.message)
    return exportFailed()
  }
  const res = NextResponse.redirect(signed.signedUrl)
  res.headers.set('Cache-Control', 'no-store')
  return res
}
