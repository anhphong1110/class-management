import { AvatarImage } from '@/components/avatar/AvatarImage'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { Top3Row } from '@/lib/overview/queries'
import './overview.css'

const DIR = '/brand/login'
const ARROW = 'M5 12h14M13 6l6 6-6 6'
const STAR = '12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9'
// Kích thước avatar theo hạng; dưới 640px .ov-ava được thu nhỏ bằng CSS.
const BASE = { 1: 'bug-vang', 2: 'bug-bac', 3: 'bug-dong' } as const
const AVATAR_SIZE = { 1: 104, 2: 84, 3: 84 } as const

function Deco({ src, className }: { src: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${DIR}/${src}`} alt="" aria-hidden="true" decoding="async" loading="lazy" draggable={false} className={`ov-top3-deco ${className}`} />
}

/** Vương miện hạng nhất (màu nằm trong overview.css). */
function Crown() {
  return (
    <svg className="ov-crown" viewBox="0 0 48 34" aria-hidden="true">
      <path d="M4 29 L7 9 L17 19 L24 5 L31 19 L41 9 L44 29 Z" />
      <circle cx="7" cy="8" r="3" />
      <circle cx="24" cy="4" r="3.4" />
      <circle cx="41" cy="8" r="3" />
    </svg>
  )
}

/** Bục Top 3: `order` đã xếp sẵn [hạng 2, hạng 1, hạng 3]. */
export function Top3Podium({ order }: { order: Top3Row[] }) {
  return (
    <section data-testid="top3" className="ov ov-top3">
      <Deco src="may.webp" className="ov-clouds-soft" />
      <Deco src="ten-lua.webp" className="ov-top3-rocket" />
      <Deco src="saturn-cam.webp" className="ov-top3-saturn" />
      <div className="ov-top3-head">
        <div>
          <h2 className="m-0 font-display text-[26px] font-extrabold text-ink">Top 3 phi hành gia xuất sắc</h2>
          <div className="text-sm font-semibold text-muted">Xếp theo sao thi đua tích lũy, không bị trừ khi đổi quà</div>
        </div>
        <ButtonLink href="/xep-hang" className="ov-btn-violet">
          Xem bảng xếp hạng
          <Icon d={ARROW} size={16} />
        </ButtonLink>
      </div>
      <div className="ov-podium">
        {order.map((t) => {
          const rank = Math.min(3, Math.max(1, t.rank)) as 1 | 2 | 3
          return (
            <div key={t.id} data-testid="top3-card" data-rank={rank} className="ov-pcard">
              <div className="ov-stage">
                {rank === 1 && t.stars > 0 ? <Crown /> : null}
                <div className="ov-ava">
                  <AvatarImage avatar={t.avatar} size={AVATAR_SIZE[rank]} />
                </div>
                <div className="ov-base">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/brand/overview/${BASE[rank]}.webp`} alt="" aria-hidden="true" width={520} height={250} loading="lazy" decoding="async" draggable={false} />
                  <div className="ov-rankpill">
                    <b>{rank}</b>
                    {`Hạng ${t.rank}`}
                  </div>
                </div>
              </div>
              <div className="ov-pname">{t.name}</div>
              <div className="ov-pstars">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <polygon points={STAR} className="fill-star stroke-star-edge" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                {t.stars} sao
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
