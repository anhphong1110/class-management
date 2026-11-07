'use client'

import { STAT } from '@/lib/rewards/status'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import type { StudentCard } from '@/lib/students/queries'
import type { ProfileDetail } from './actions'

const box = 'flex flex-[1_1_300px] flex-col gap-2 rounded-panel border-2 border-edge bg-white px-[18px] py-4'
const h3 = 'm-0 font-display text-lg font-extrabold'

export function ProfilePanel({
  student,
  detail,
  failed,
  onClose,
  onEdit,
  onArchive,
  onDelete,
}: {
  student: StudentCard
  detail: ProfileDetail | null
  failed: boolean
  onClose: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
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
      className="clay-card flex flex-col gap-[18px] p-6"
      style={{ background: 'linear-gradient(135deg,var(--primary-soft),#FFFFFF)' }}
    >
      <div className="flex flex-wrap items-center gap-[18px]">
        <AvatarImage avatar={student.avatar} size={124} crown={crown} />
        <div className="flex flex-[1_1_240px] flex-col gap-1.5">
          <div className="text-[13px] font-extrabold tracking-[.1em] text-primary-deep">HỒ SƠ PHI HÀNH GIA</div>
          <div className="font-display text-[30px] font-extrabold leading-[1.1]">{student.fullName}</div>
          <div className="text-[14.5px] font-bold text-muted">
            Mã {student.code} · Số thứ tự {student.rollNo} · Đang học
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {detail?.badges.length ? (
              detail.badges.map((b) => (
                <Badge key={b.id} tone="star">
                  <Icon d={ICONS.star} size={14} />
                  {b.name}
                </Badge>
              ))
            ) : (
              <span className="text-[13px] font-bold text-muted">{detail ? 'Chưa có huy hiệu' : ''}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <Button variant="secondary" onClick={onEdit}>
            Sửa thông tin
          </Button>
          <Button variant="secondary" onClick={onArchive} className="!border-danger !text-danger-deep [--edge:var(--color-danger-soft)] hover:!bg-danger-soft">
            <Icon d={ICONS.trash} size={18} />
            Lưu trữ
          </Button>
          <Button variant="secondary" onClick={onDelete} className="!border-danger !text-danger-deep [--edge:var(--color-danger-soft)] hover:!bg-danger-soft">
            <Icon d={ICONS.trash} size={18} />
            Xóa học sinh
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Đóng hồ sơ
          </Button>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        {stats.map((s) => (
          <div key={s.label} className="rounded-panel border-2 border-edge bg-white px-4 py-3.5">
            <div className="text-[13px] font-bold text-muted">{s.label}</div>
            <div data-testid={`stat-${s.label}`} className="font-display text-[28px] font-extrabold leading-[1.15]">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {failed && <Notice tone="error">Chưa tải được hồ sơ, cô thử lại nhé.</Notice>}

      <div className="flex flex-wrap gap-4">
        <div className={box}>
          <h3 className={h3}>Lịch sử cộng/trừ sao</h3>
          {detail && detail.history.length === 0 && <div className="text-sm font-semibold text-muted">Chưa có lượt cộng/trừ sao</div>}
          {detail?.history.map((h) => (
            <div key={h.key} data-testid="star-history-row" className="flex items-center gap-2.5">
              <span
                className={`min-w-10 rounded-chip px-2 py-1 text-center font-extrabold ${
                  h.delta >= 0 ? 'bg-star-soft text-star-ink' : 'bg-danger-soft text-danger-deep'
                }`}
              >
                {h.delta > 0 ? `+${h.delta}` : `-${Math.abs(h.delta)}`}
              </span>
              <span className="text-[14.5px] font-semibold">
                {h.text}
                <span className="text-muted"> · {h.date}</span>
              </span>
            </div>
          ))}
        </div>
        <div className={box}>
          <h3 className={h3}>Lịch sử đổi quà</h3>
          {detail && detail.gifts.length === 0 && <div className="text-sm font-semibold text-muted">Chưa có lượt đổi quà</div>}
          {detail?.gifts.map((g) => {
            const [label, tint, ink] = STAT[g.status] ?? STAT.pending
            return (
              <div key={g.id} className="flex items-center justify-between gap-2.5 text-[14.5px] font-semibold">
                <span>
                  {g.name} <span className="text-muted">· {g.date}</span>
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
