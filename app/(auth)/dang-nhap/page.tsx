import type { CSSProperties } from 'react'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { toVietnameseMessage } from '@/lib/errors'
import { brandSentence } from '@/lib/classes/brand'
import { themeVars } from '@/lib/domain/theme'
import { demoRoles } from '@/lib/auth/demo'
import LoginForm from './LoginForm'
import LoginScene from './LoginScene'
import './login.css'
import DemoButtons from './DemoButtons'

export const dynamic = 'force-dynamic'

async function loadClass() {
  const admin = createAdminSupabase()
  const { data } = await admin
    .from('classes')
    .select('id, school_name, class_name, brand_title, teacher_name, slogan, theme, logo_path')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  // Ngoại lệ có chủ ý: trang đăng nhập chưa có phiên (không gọi được requireTeacher), nên dùng khóa dịch vụ
  // chỉ để ký đường dẫn logo của trường. Chỉ ký đường dẫn nằm trong <lớp>/branding/ (save_class_info bảo đảm điều này,
  // và giáo viên không còn quyền UPDATE trực tiếp các cột đường dẫn).
  const sign = async (path: string | null | undefined) => {
    if (!path || !data || !path.startsWith(`${data.id}/branding/`)) return null
    const { data: signed } = await admin.storage.from('class-media').createSignedUrl(path, 3600)
    return signed?.signedUrl ?? null
  }
  return data && { ...data, logoUrl: await sign(data.logo_path) }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const sp = await searchParams
  const cls = await loadClass()
  const demo = demoRoles()
  const school = cls?.school_name || 'Tiểu học Chính Nghĩa'
  const className = cls?.class_name ?? ''
  const teacher = cls?.teacher_name ?? ''
  // Tiêu đề hai dòng: "Trạm không gian" / "Năm N" (hoặc một dòng nếu tên cô đặt không có tiền tố này).
  const sentence = brandSentence({ class_name: className, brand_title: cls?.brand_title })
  const brandParts = /^(trạm không gian)\s+(.+)$/iu.exec(sentence)
  const slogan = cls?.slogan || 'Cùng học – Cùng chơi – Cùng tỏa sáng'
  const initialError =
    sp.error === 'no_profile' || sp.error === 'class_archived' || sp.error === 'account_banned'
      ? toVietnameseMessage(sp.error)
      : undefined

  return (
    <main style={themeVars(cls?.theme) as CSSProperties} className="sp font-body">
      {/* eslint-disable @next/next/no-img-element */}
      <img src="/brand/login/mat-trang.webp" alt="" aria-hidden="true" decoding="async" draggable={false} className="sp-moon" />
      <img src="/brand/login/may.webp" alt="" aria-hidden="true" decoding="async" draggable={false} className="sp-clouds" />
      {/* eslint-enable @next/next/no-img-element */}
      <LoginScene
        school={school}
        className={className}
        teacher={teacher}
        logoUrl={cls?.logoUrl ?? null}
        title={sentence}
        slogan={slogan}
      />

      <section className="sp-cockpit">
        <div className="sp-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/login/ten-lua.webp" alt="" aria-hidden="true" className="sp-card-rocket" />
          <div>
            <h2 className="sp-welcome">
              Chào mừng đến
              <b>{`${brandParts ? `Trạm ${brandParts[2]}` : sentence}!`}</b>
            </h2>
            <p className="sp-sub">Chọn vai trò của bạn để bắt đầu hành trình khám phá nhé!</p>
          </div>
          {demo.length > 0 && <DemoButtons roles={demo} next={sp.next} />}
          <LoginForm next={sp.next} initialError={initialError} />
        </div>
      </section>
    </main>
  )
}
