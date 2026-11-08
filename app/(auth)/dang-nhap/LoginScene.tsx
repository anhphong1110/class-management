import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { schoolLabel } from '@/lib/classes/brand'

/**
 * Cảnh vũ trụ bên trái trang đăng nhập.
 * Hình 3D (nhóm nhân vật, tên lửa, Sao Thổ, robot, sao, sách, mặt trăng, mây, chữ tiêu đề) là ảnh WebP trong suốt
 * ở public/brand/login/ (đã cắt viền và nén; xem docs/LOGIN-ASSETS.md). Chỉ các tia lấp lánh còn là SVG.
 */
const DIR = '/brand/login'

// Quả Trái Đất sau nhóm nhân vật: có file trai-dat.webp thì hiện, chưa có thì chỉ còn vầng sáng mềm.
const hasEarth = () => existsSync(join(process.cwd(), 'public', 'brand', 'login', 'trai-dat.webp'))

function Deco({ src, className, style }: { src: string; className: string; style?: React.CSSProperties }) {
  // Ảnh trang trí tĩnh, đã tối ưu sẵn: dùng <img> thường (không cần pipeline ảnh của Next).
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${DIR}/${src}`} alt="" aria-hidden="true" decoding="async" loading="eager" draggable={false} className={`sp-deco ${className}`} style={style} />
}

export default function LoginScene({
  school,
  className,
  teacher,
  logoUrl,
  title,
  slogan,
}: {
  school: string
  className: string
  teacher: string
  logoUrl: string | null
  /** Câu tiêu đề đã chốt, ví dụ "Trạm không gian Năm 8" (xem brandSentence). */
  title: string
  slogan: string
}) {
  const classLine = [className && `LỚP ${className}`, teacher && `TEAM ${teacher}`]
    .filter(Boolean)
    .join(' – ')
    .toLocaleUpperCase('vi-VN')
  // Tiêu đề hai dòng: "Trạm không gian" / "Năm N"; không theo mẫu này thì hiện nguyên câu.
  const parts = /^(trạm không gian)\s+(.+)$/iu.exec(title)
  // Ảnh chữ 3D chỉ có bản "Trạm không gian Năm 8"; tiêu đề khác thì dùng chữ web có viền.
  const useTitleImage = /^trạm không gian năm 8$/iu.test(title.trim())

  return (
    <section className="sp-scene" aria-label="Trạm không gian">
      <div className="sp-brand">
        <div className="sp-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl ?? '/brand/logo-truong.jpg'} alt={`Logo trường ${school}`} width={92} height={92} />
        </div>
        <div>
          <p className="sp-school">{schoolLabel(school).toLocaleUpperCase('vi-VN')}</p>
          {classLine && <span className="sp-class">{classLine}</span>}
        </div>
      </div>

      <div className="sp-art">
        <div className="sp-halo" aria-hidden="true" />
        {hasEarth() && <Deco src="trai-dat.webp" className="sp-earth" />}
        <Deco src="saturn-tim.webp" className="sp-saturn" />
        <div className="sp-trail" aria-hidden="true" />
        <Deco src="ten-lua.webp" className="sp-rocket" />
        <Deco src="sao-tho.webp" className="sp-mascot" />
        <Deco src="lap-lanh.svg" className="sp-sparkle" style={{ left: '27%', top: '4%' }} />
        <Deco src="lap-lanh.svg" className="sp-sparkle" style={{ right: '27%', top: '38%', animationDelay: '-1.4s' }} />
        <Deco src="sao.svg" className="sp-sparkle" style={{ left: '34%', bottom: '8%', width: 22, animationDelay: '-0.8s' }} />

        <div className="sp-cluster">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${DIR}/nhom-nhan-vat.webp`}
            alt="Cô Mai Khanh và hai bạn học sinh phi hành gia vẫy tay chào"
            width={993}
            height={989}
            fetchPriority="high"
            className="sp-group"
          />
        </div>

        <Deco src="robot.webp" className="sp-robot" />
        <Deco src="sach.webp" className="sp-books" />
        <Deco src="saturn-cam.webp" className="sp-saturn-2" />
      </div>

      <div className="sp-titlebox">
        <h1 className="sp-title" aria-label={title}>
          {useTitleImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${DIR}/tieu-de.webp`} alt="" aria-hidden="true" width={1100} height={470} fetchPriority="high" className="sp-title-img" />
          ) : (
            <>
              <span className="sp-title-top">{parts ? parts[1] : title}</span>
              {parts && <span className="sp-title-accent">{parts[2]}</span>}
            </>
          )}
        </h1>
        <p className="sp-slogan">{slogan}</p>
      </div>
    </section>
  )
}
