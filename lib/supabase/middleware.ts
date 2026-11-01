import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveRoute } from '@/lib/auth/route-guard'
import type { Role } from '@/lib/domain/types'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  let role: Role | null = null
  let banned = false
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    // Tài khoản vừa bị khóa: GoTrue từ chối token cũ. Đưa qua /dang-xuat để xóa phiên và báo đúng câu.
    banned = userError?.code === 'user_banned'
    if (userData?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle()
      const r = profile?.role
      role = r === 'teacher' || r === 'student' ? r : null
    }
  } catch {
    role = null
  }

  if (banned && request.nextUrl.pathname !== '/dang-xuat') {
    const url = request.nextUrl.clone()
    url.pathname = '/dang-xuat'
    url.search = '?reason=account_banned'
    return NextResponse.redirect(url)
  }

  const decision = resolveRoute({ pathname: request.nextUrl.pathname, role })
  if (decision.action === 'redirect') {
    const url = request.nextUrl.clone()
    const [path, query] = decision.to.split('?')
    url.pathname = path
    url.search = query ? `?${query}` : ''
    const redirect = NextResponse.redirect(url)
    // Giữ cookie phiên vừa làm mới (nếu có).
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }
  return response
}
