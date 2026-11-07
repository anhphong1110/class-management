import type { ReactNode } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
// Dùng chung bộ kiểu banner vũ trụ với trang Tổng quan của giáo viên (không có nhân vật cô và các bạn).
import '../(teacher)/tong-quan/overview.css'

const DIR = '/brand/login'

function Deco({ src, className }: { src: string; className: string }) {
  // Ảnh trang trí tĩnh đã tối ưu sẵn: dùng <img> thường.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${DIR}/${src}`} alt="" aria-hidden="true" decoding="async" loading="lazy" draggable={false} className={`ov-deco ${className}`} />
}

/**
 * Banner chào học sinh: nền vũ trụ, Trái Đất, Sao Thổ, tên lửa, sao và mây.
 * `avatar` là nút đổi avatar của học sinh, đặt ở giữa Trái Đất.
 */
export function StudentHero({
  greeting,
  available,
  main,
  avatar,
}: {
  greeting: string
  available: number
  main: 'gifts' | 'stars' | null
  avatar: ReactNode
}) {
  return (
    <section className="ov ov-hero ov-hero-student" data-testid="student-hero">
      <Deco src="may.webp" className="ov-clouds" />
      <div className="ov-hero-text">
        <p className="ov-ribbon">CÙNG HỌC – CÙNG CHƠI – CÙNG TỎA SÁNG</p>
        <h1 className="ov-title">{greeting}</h1>
        <p className="ov-sub">Hôm nay em còn {available} sao khả dụng. Cố gắng thêm nhé, phi hành gia nhí!</p>
        {main === 'gifts' && (
          <div className="ov-actions">
            <ButtonLink size="lg" variant="accent" href="/em/doi-qua" className="ov-btn ov-btn-gold">
              <Icon d={ICONS.gift} size={22} />
              Đi đổi quà
            </ButtonLink>
          </div>
        )}
        {main === 'stars' && (
          <div className="ov-actions">
            <ButtonLink size="lg" variant="accent" href="/em/sao" className="ov-btn ov-btn-gold">
              <Icon d={ICONS.star} size={22} />
              Xem lịch sử sao
            </ButtonLink>
          </div>
        )}
      </div>
      <div className="ov-art" aria-label="Trang trí vũ trụ">
        <Deco src="trai-dat.webp" className="ov-earth" />
        <Deco src="saturn-tim.webp" className="ov-saturn" />
        <Deco src="sao-tho.webp" className="ov-mascot-star" />
        <Deco src="ten-lua.webp" className="ov-rocket" />
        <Deco src="lap-lanh.svg" className="ov-star" />
        <div className="ov-art-avatar">{avatar}</div>
      </div>
    </section>
  )
}
