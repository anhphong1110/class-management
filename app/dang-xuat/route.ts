import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // vẫn chuyển hướng dù đăng xuất lỗi
  }

  const reason = request.nextUrl.searchParams.get('reason')
  const url = request.nextUrl.clone()
  url.pathname = '/dang-nhap'
  url.search = reason === 'no_profile' ? '?error=no_profile' : ''
  return NextResponse.redirect(url)
}
