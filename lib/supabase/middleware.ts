import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PATHNAME_HEADER, resolveRoute } from '@/lib/auth/route-guard'
import type { Role } from '@/lib/domain/types'

// Middleware chạy ở Edge gần người dùng, còn Supabase ở Ireland: mỗi lần hỏi profiles mất vài trăm ms.
// Nên nhớ role trong cookie có ký HMAC, sống 10 phút. Trang và server action vẫn tự kiểm quyền.
export const ROLE_COOKIE = 'mk_role'
const ROLE_TTL_S = 600

async function hmac(payload: string): Promise<string | null> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return null
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload)))
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function makeRoleCookie(uid: string, role: Role, now = Date.now()): Promise<string | null> {
  const payload = `${uid}.${role}.${Math.floor(now / 1000) + ROLE_TTL_S}`
  const sig = await hmac(payload)
  return sig ? `${payload}.${sig}` : null
}

export async function readRoleCookie(value: string | undefined, uid: string, now = Date.now()): Promise<Role | null> {
  const parts = value?.split('.')
  if (!parts || parts.length !== 4) return null
  const [cUid, cRole, exp, sig] = parts
  if (cUid !== uid || (cRole !== 'teacher' && cRole !== 'student')) return null
  if (!(Number(exp) > now / 1000)) return null
  return (await hmac(`${cUid}.${cRole}.${exp}`)) === sig ? cRole : null
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Ghi đè (không thêm vào) để client không tự gửi được giá trị giả; cả hai NextResponse.next bên dưới đều chuyển nó xuống.
  request.headers.set(PATHNAME_HEADER, request.nextUrl.pathname)
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
      const uid = userData.user.id
      role = await readRoleCookie(request.cookies.get(ROLE_COOKIE)?.value, uid)
      if (!role) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle()
        const r = profile?.role
        role = r === 'teacher' || r === 'student' ? r : null
        if (role) {
          const value = await makeRoleCookie(uid, role)
          if (value) response.cookies.set(ROLE_COOKIE, value, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: ROLE_TTL_S })
        }
      }
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
