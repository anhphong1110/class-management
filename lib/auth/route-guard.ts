import { TEACHER_NAV } from '@/components/layout/nav'
import type { Role } from '@/lib/domain/types'

export type RouteDecision = { action: 'allow' } | { action: 'redirect'; to: string }

const TEACHER_PREFIXES = [...TEACHER_NAV.map((n) => n.href), '/trinh-chieu']
const PUBLIC_PREFIXES = ['/_next', '/brand']
const PUBLIC_EXACT = ['/favicon.ico']

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

  if (TEACHER_PREFIXES.some((p) => matchesPrefix(pathname, p)) && role !== 'teacher') {
    return { action: 'redirect', to: '/em' }
  }

  return { action: 'allow' }
}
