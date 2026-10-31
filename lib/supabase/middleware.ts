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
  try {
    const { data: userData } = await supabase.auth.getUser()
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
