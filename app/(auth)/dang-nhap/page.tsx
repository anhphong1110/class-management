import type { CSSProperties } from 'react'
import Image from 'next/image'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { toVietnameseMessage } from '@/lib/errors'
import { brandLines } from '@/lib/classes/brand'
import { themeVars } from '@/lib/domain/theme'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

async function loadClass() {
  const admin = createAdminSupabase()
  const { data } = await admin
    .from('classes')
    .select('school_name, class_name, teacher_name, slogan, theme, logo_path, class_logo_path')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  // Ngoại lệ có chủ ý: trang đăng nhập chưa có phiên (không gọi được requireTeacher), nên dùng khóa dịch vụ
  // chỉ để ký hai đường dẫn logo của lớp. Hàm save_class_info đã bảo đảm các đường dẫn này nằm trong <lớp>/branding/.
  const sign = async (path: string | null | undefined) => {
    if (!path) return null
    const { data: signed } = await admin.storage.from('class-media').createSignedUrl(path, 3600)
    return signed?.signedUrl ?? null
  }
  return data && { ...data, logoUrl: await sign(data.logo_path), classLogoUrl: await sign(data.class_logo_path) }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const sp = await searchParams
  const cls = await loadClass()
  const school = cls?.school_name || 'Tiểu học Chính Nghĩa'
  const className = cls?.class_name ?? ''
  const teacher = cls?.teacher_name ?? ''
  const brand = brandLines({ class_name: className })
  const slogan = cls?.slogan || 'Cùng học – Cùng chơi – Cùng tỏa sáng'
  const initialError = sp.error === 'no_profile' ? toVietnameseMessage('no_profile') : undefined

  return (
    <main style={themeVars(cls?.theme) as CSSProperties} className="relative box-border flex min-h-screen flex-wrap items-center justify-center gap-6 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#4B4FB5_0%,#2B2E7E_45%,#1E2160_100%)] p-6 font-body">
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-full"
      >
        <g style={{ animation: 'tw 3s ease-in-out infinite' }}>
          <circle cx="80" cy="70" r="3" fill="#FFE08A" />
          <circle cx="260" cy="40" r="2" fill="#fff" />
          <circle cx="520" cy="90" r="3" fill="#FFE08A" />
          <circle cx="780" cy="50" r="2" fill="#fff" />
          <circle cx="930" cy="140" r="3" fill="#FFE08A" />
          <circle cx="40" cy="330" r="2" fill="#fff" />
          <circle cx="960" cy="420" r="2.5" fill="#fff" />
          <circle cx="120" cy="540" r="3" fill="#FFE08A" />
          <circle cx="600" cy="570" r="2" fill="#fff" />
        </g>
      </svg>

      <section className="relative flex w-full max-w-[560px] flex-[1_1_380px] flex-col items-center gap-3.5 text-center text-white">
        <div className="flex items-center gap-3">
          <div className="relative h-[88px] w-[88px] flex-none overflow-hidden rounded-full bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cls?.logoUrl ?? '/brand/logo-truong.jpg'}
              alt={`Logo trường ${school}`}
              width={92}
              height={92}
              className="absolute -left-0.5 -top-0.5 h-[92px] w-[92px] max-w-none object-cover"
            />
          </div>
          <div className="relative h-[88px] w-[88px] flex-none overflow-hidden rounded-full bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cls?.classLogoUrl ?? '/brand/logo-lop.jpg'}
              alt={className ? `Logo lớp ${className}` : 'Logo lớp'}
              width={92}
              height={92}
              className="absolute -left-0.5 -top-0.5 h-[92px] w-[92px] max-w-none object-cover"
            />
          </div>
        </div>
        <div className="font-display text-[22px] font-extrabold tracking-[0.06em]">
          {`TRƯỜNG ${school}`.toLocaleUpperCase('vi-VN')}
        </div>
        <div className="text-sm font-extrabold tracking-[0.18em] text-[#FFE08A]">
          {[className && `LỚP ${className}`, teacher && `TEAM ${teacher}`].filter(Boolean).join(' · ').toLocaleUpperCase('vi-VN')}
        </div>
        <div className="w-full max-w-[520px]" style={{ animation: 'fl 5s ease-in-out infinite' }}>
          <Image
            src="/brand/ba-ban-nho.png"
            alt="Ba bạn học sinh chibi"
            width={1100}
            height={447}
            priority
            className="block h-auto w-full"
          />
        </div>
        <h1 className="m-0 font-display text-[46px] font-extrabold leading-[1.05]">
          Trạm không gian
          {brand.accent && (
            <>
              <br />
              {`Năm ${brand.accent.slice(4)}`}
            </>
          )}
        </h1>
        <p className="m-0 text-[17px] text-[#E4E7FF]">{slogan}</p>
      </section>

      <section className="relative flex w-full max-w-[460px] flex-[1_1_360px] flex-col gap-[18px] rounded-[32px] bg-white px-[30px] py-8 shadow-[0_30px_60px_rgba(10,12,60,0.45)]">
        <div>
          <h2 className="m-0 font-display text-[28px] font-extrabold">Đăng nhập</h2>
          <div className="text-[14.5px] text-muted">Chọn tài khoản để vào trạm không gian</div>
        </div>
        <LoginForm next={sp.next} initialError={initialError} />
      </section>
    </main>
  )
}
