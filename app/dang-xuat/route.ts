import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()

  const reason = request.nextUrl.searchParams.get('reason') ?? 'no_profile'
  const url = request.nextUrl.clone()
  url.pathname = '/dang-nhap'
  url.search = reason === 'no_profile' ? '?error=no_profile' : ''
  return NextResponse.redirect(url)
}
