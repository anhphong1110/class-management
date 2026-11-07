import { ButtonLink } from '@/components/ui/Button'
import './overview.css'

/**
 * Banner chào mừng của trang Tổng quan.
 * Hình 3D dùng lại bộ ảnh của trang đăng nhập (public/brand/login/); ảnh bìa lớp do cô tải lên (Cài đặt) thay cụm nhân vật.
 */
const DIR = '/brand/login'

function Deco({ src, className }: { src: string; className: string }) {
  // Ảnh trang trí tĩnh đã tối ưu sẵn: dùng <img> thường.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${DIR}/${src}`} alt="" aria-hidden="true" decoding="async" loading="lazy" draggable={false} className={`ov-deco ${className}`} />
}

export function Hero({ greeting, coverUrl, brand }: { greeting: string; coverUrl: string | null; brand: string }) {
  return (
    <div className="ov ov-hero" data-testid="hero">
      <div className="ov-hero-text">
        <p className="ov-ribbon">CÙNG HỌC – CÙNG CHƠI – CÙNG TỎA SÁNG</p>
        <h2 className="ov-title">Xin chào, {greeting}!</h2>
        <p className="ov-sub">Chào mừng cô trở lại {brand}. Hôm nay cả phi hành đoàn đã sẵn sàng cất cánh!</p>
        <div className="ov-actions">
          <ButtonLink variant="accent" href="/diem-danh" className="ov-btn ov-btn-gold">
            Bắt đầu điểm danh
          </ButtonLink>
          <ButtonLink href="/thi-dua" className="ov-btn ov-btn-pink">
            Cộng sao cho lớp
          </ButtonLink>
        </div>
      </div>

      {coverUrl ? (
        <div className="ov-art">
          <Deco src="may.webp" className="ov-clouds" />
          <div className="ov-cover-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-testid="hero-cover" src={coverUrl} alt="" />
          </div>
          <Deco src="ten-lua.webp" className="ov-rocket" />
          <Deco src="sao-tho.webp" className="ov-star" />
        </div>
      ) : (
        <div className="ov-art" data-testid="hero-art">
          <Deco src="trai-dat.webp" className="ov-earth" />
          <Deco src="saturn-tim.webp" className="ov-saturn" />
          <Deco src="sao-tho.webp" className="ov-mascot-star" />
          <Deco src="ten-lua.webp" className="ov-rocket" />
          <Deco src="lap-lanh.svg" className="ov-star" />
          <Deco src="nhom-nhan-vat.webp" className="ov-group" />
          <Deco src="may.webp" className="ov-clouds" />
        </div>
      )}
    </div>
  )
}
