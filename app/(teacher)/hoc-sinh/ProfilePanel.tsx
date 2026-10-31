'use client'

import { STAT } from '@/lib/rewards/status'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import type { StudentCard } from '@/lib/students/queries'
import type { ProfileDetail } from './actions'

const box = 'flex flex-[1_1_300px] flex-col gap-2 rounded-[20px] bg-white px-[18px] py-4'
const h3 = 'm-0 font-display text-lg font-extrabold'

export function ProfilePanel({
  student,
  detail,
  failed,
  onClose,
  onEdit,
  onArchive,
}: {
  student: StudentCard
  detail: ProfileDetail | null
  failed: boolean
  onClose: () => void
  onEdit: () => void
  onArchive: () => void
}) {
  const stats = [
    { label: 'Sao thi đua tích lũy', value: String(student.competition) },
    { label: 'Sao khả dụng', value: String(student.available) },
    { label: 'Thứ hạng cả năm', value: detail?.rank != null ? `#${detail.rank}` : '—' },
    { label: 'Tỉ lệ chuyên cần', value: detail?.attendanceRate ?? '—' },
  ]
  const crown = detail?.rank === 1 && student.competition > 0
  return (
    <section
      role="region"
      aria-label="Hồ sơ phi hành gia"
      className="flex flex-col gap-[18px] rounded-[30px] border-2 border-[#B9A7F8] p-6"
      style={{ background: 'linear-gradient(135deg,#ECE9FF,#FFFFFF)' }}
    >
      <div className="flex flex-wrap items-center gap-[18px]">
        <AvatarImage avatar={student.avatar} size={124} crown={crown} />
        <div className="flex flex-[1_1_240px] flex-col gap-1.5">
          <div className="text-[13px] font-extrabold tracking-[.1em] text-[#4F5BD5]">HỒ SƠ PHI HÀNH GIA</div>
          <div className="font-display text-[30px] font-extrabold leading-[1.1]">{student.fullName}</div>
          <div className="text-[14.5px] font-bold text-[#5B5890]">
            Mã {student.code} · Số thứ tự {student.rollNo} · Đang học
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {detail?.badges.length ? (
              detail.badges.map((b) => (
                <span key={b.id} className="rounded-full bg-[#FFF1CC] px-3 py-1 text-[12.5px] font-extrabold text-[#6E4700]">
                  {b.name}
                </span>
              ))
            ) : (
              <span className="text-[13px] font-bold text-[#5B5890]">{detail ? 'Chưa có huy hiệu' : ''}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button type="button" onClick={onEdit} className={actionBtn}>
            Sửa thông tin
          </button>
          <button type="button" onClick={onArchive} className={`${actionBtn} !text-[#8E1B3B]`}>
            Lưu trữ
          </button>
          <button type="button" onClick={onClose} className={actionBtn}>
            Đóng hồ sơ
          </button>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        {stats.map((s) => (
          <div key={s.label} className="rounded-[18px] bg-white px-4 py-3.5">
            <div className="text-[13px] font-bold text-[#5B5890]">{s.label}</div>
            <div data-testid={`stat-${s.label}`} className="font-display text-[28px] font-extrabold leading-[1.15]">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {failed && <div role="alert" className="rounded-[14px] bg-[#FFE3EA] px-4 py-3 text-sm font-bold text-[#8E1B3B]">Chưa tải được hồ sơ, cô thử lại nhé.</div>}

      <div className="flex flex-wrap gap-4">
        <div className={box}>
          <h3 className={h3}>Lịch sử cộng/trừ sao</h3>
          {detail && detail.history.length === 0 && <div className="text-sm font-semibold text-[#5B5890]">Chưa có lượt cộng/trừ sao</div>}
          {detail?.history.map((h) => (
            <div key={h.key} data-testid="star-history-row" className="flex items-center gap-2.5">
              <span
                className="min-w-10 rounded-[10px] px-2 py-1 text-center font-extrabold"
                style={h.delta >= 0 ? { background: '#FFF1CC', color: '#6E4700' } : { background: '#FFE3EE', color: '#8E1B3B' }}
              >
                {h.delta > 0 ? `+${h.delta}` : `-${Math.abs(h.delta)}`}
              </span>
              <span className="text-[14.5px] font-semibold">
                {h.text}
                <span className="text-[#5B5890]"> · {h.date}</span>
              </span>
            </div>
          ))}
        </div>
        <div className={box}>
          <h3 className={h3}>Lịch sử đổi quà</h3>
          {detail && detail.gifts.length === 0 && <div className="text-sm font-semibold text-[#5B5890]">Chưa có lượt đổi quà</div>}
          {detail?.gifts.map((g) => {
            const [label, tint, ink] = STAT[g.status]
            return (
              <div key={g.id} className="flex items-center justify-between gap-2.5 text-[14.5px] font-semibold">
                <span>
                  {g.name} <span className="text-[#5B5890]">· {g.date}</span>
                </span>
                <span className="rounded-full px-2.5 py-0.5 text-[13px] font-extrabold" style={{ background: tint, color: ink }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const actionBtn =
  'min-h-11 cursor-pointer rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-[18px] text-[14.5px] font-extrabold text-[#3441B5]'
