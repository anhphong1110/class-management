import type { Role } from '@/lib/domain/types'

export type RouteDecision = { action: 'allow' } | { action: 'redirect'; to: string }

/** Header do middleware ghi đè bằng đường dẫn thật để layout biết trang đang mở (client không giả được). */
export const PATHNAME_HEADER = 'x-pathname'

const PUBLIC_PREFIXES = ['/_next', '/brand']
// /api/chat tự kiểm phiên và trả 401 khi chưa đăng nhập; nếu không mở ở đây thì học sinh bị đẩy về /em,
// khách bị đẩy về trang đăng nhập và khung chat không hoạt động.
const PUBLIC_EXACT = ['/favicon.ico', '/dang-xuat', '/api/chat']

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + '/')
}

const homeFor = (role: Role) => (role === 'teacher' ? '/tong-quan' : '/em')

export function resolveRoute(input: { pathname: string; role: Role | null }): RouteDecision {
  const { pathname, role } = input

  if (PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIXES.some((p) => matchesPrefix(pathname, p))) {
    return { action: 'allow' }
  }

  if (matchesPrefix(pathname, '/dang-nhap')) {
    return role ? { action: 'redirect', to: homeFor(role) } : { action: 'allow' }
  }

  if (!role) {
    return { action: 'redirect', to: `/dang-nhap?next=${encodeURIComponent(pathname)}` }
  }

  if (pathname === '/') return { action: 'redirect', to: homeFor(role) }

  if (role === 'student' && !matchesPrefix(pathname, '/em')) {
    return { action: 'redirect', to: '/em' }
  }

  return { action: 'allow' }
}
