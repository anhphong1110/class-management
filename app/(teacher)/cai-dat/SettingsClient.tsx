'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { Switch } from '@/components/ui/Switch'
import { compressImage } from '@/lib/domain/compress-image'
import { THEMES, type ThemeKey } from '@/lib/domain/theme'
import { MAX_UPLOAD_BYTES, validateImageFile } from '@/lib/domain/upload'
import { toVietnameseMessage } from '@/lib/errors'
import { addStep, infoPayload, parseStepInput, removeStep, type InfoValues } from '@/lib/settings/form'
import type { SettingsClass, SettingsData, SettingsFlags } from '@/lib/settings/queries'
import { saveClassInfo, saveClassSettings, setSaturday, uploadBranding } from './actions'

type Msg = { tone: 'success' | 'error'; text: string }
type FlagKey = { [K in keyof SettingsFlags]: SettingsFlags[K] extends boolean ? K : never }[keyof SettingsFlags]
type UploadKind = 'logo_path' | 'class_logo_path' | 'cover_path'

const SAVED = 'Đã lưu cài đặt.'
const card =
  'flex flex-col gap-3.5 rounded-[26px] bg-white px-6 py-[22px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]'
const h2 = 'm-0 font-display text-[22px] font-extrabold'
const row = 'rounded-2xl border-2 border-[#E4E0F7] bg-white px-3.5 py-1.5'
const fieldLabel = 'flex flex-col gap-1 text-sm font-extrabold text-[#4A476E]'
const input =
  'min-h-12 box-border rounded-xl border-2 border-[#D9D5F2] bg-white px-3.5 text-base font-bold text-ink disabled:opacity-50'

const INFO_FIELDS: [keyof InfoValues, string][] = [
  ['school_name', 'Tên trường'],
  ['class_name', 'Tên lớp'],
  ['school_year', 'Năm học'],
  ['teacher_name', 'Giáo viên chủ nhiệm'],
  ['slogan', 'Slogan'],
]
const TERM_FIELDS: [keyof InfoValues, string][] = [
  ['term1_start', 'Học kỳ 1 bắt đầu'],
  ['term1_end', 'Học kỳ 1 kết thúc'],
  ['term2_start', 'Học kỳ 2 bắt đầu'],
  ['term2_end', 'Học kỳ 2 kết thúc'],
]
const UPLOADS: [UploadKind, string, string, number][] = [
  ['logo_path', 'Tải lên logo trường', 'upload-logo', 512],
  ['class_logo_path', 'Tải lên logo lớp', 'upload-class-logo', 512],
  ['cover_path', 'Tải lên ảnh bìa lớp', 'upload-cover', 1600],
]
const RULES: [FlagKey, string, string][] = [
  ['require_approval', 'Giáo viên duyệt mọi yêu cầu đổi quà', 'Tắt thì học sinh đổi quà xong là trừ sao ngay'],
  ['reserve_on_request', 'Giữ trước sao và quà khi gửi yêu cầu', 'Tránh bán vượt số lượng quà'],
  ['only_enough', 'Chỉ cho đổi khi đủ sao khả dụng', 'Không bao giờ để số dư sao âm'],
]
const FEATURES: [FlagKey, string, string][] = [
  ['feature_missions', 'Nhiệm vụ và huy hiệu', 'Giáo viên tạo nhiệm vụ, học sinh nhận huy hiệu'],
  ['feature_random', 'Gọi tên ngẫu nhiên', 'Hiện trang quay số trong menu'],
  ['feature_display', 'Chế độ trình chiếu lớp học', 'Toàn màn hình, không hiện dữ liệu riêng tư'],
  ['feature_rewards', 'Trạm đổi quà', 'Tắt thì học sinh không thấy trang quà'],
]
const VIEWS: [FlagKey, string][] = [
  ['student_can_view_profile', 'Hồ sơ của mình'],
  ['student_can_view_history', 'Lịch sử sao của mình'],
  ['student_can_view_rank', 'Bảng xếp hạng'],
  ['student_can_view_rewards', 'Phần thưởng và đổi quà'],
  ['student_can_view_timetable', 'Thời khóa biểu'],
  ['student_can_view_news', 'Thông báo'],
  ['student_can_view_attendance', 'Lịch sử điểm danh của mình'],
]

function toInfo(c: SettingsClass): InfoValues {
  return {
    school_name: c.school_name,
    class_name: c.class_name,
    school_year: c.school_year,
    teacher_name: c.teacher_name,
    slogan: c.slogan,
    term1_start: c.term1_start ?? '',
    term1_end: c.term1_end ?? '',
    term2_start: c.term2_start ?? '',
    term2_end: c.term2_end ?? '',
  }
}

export function SettingsClient({ cls, settings, saturdaySlots }: SettingsData) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<Msg | null>(null)
  const [vals, setVals] = useState<InfoValues>(() => toInfo(cls))
  const [theme, setTheme] = useState<ThemeKey>(cls.theme)
  const [s, setS] = useState<SettingsFlags>(settings)
  const [limit, setLimit] = useState(String(settings.weekly_redeem_limit))
  const [adding, setAdding] = useState(false)
  const [stepText, setStepText] = useState('')
  const [askSaturday, setAskSaturday] = useState(false)
  const fileRefs = useRef<Partial<Record<UploadKind, HTMLInputElement | null>>>({})

  const ok = () => setMsg({ tone: 'success', text: SAVED })
  const fail = (text: string) => setMsg({ tone: 'error', text })

  /** Gọi Server Action; nếu ném lỗi (mất mạng...) thì hoàn lại giao diện và báo lỗi chung. */
  async function call(fn: () => Promise<{ error?: string }>, revert?: () => void): Promise<{ error?: string }> {
    try {
      return await fn()
    } catch {
      revert?.()
      return { error: toVietnameseMessage('unknown') }
    }
  }

  function saveInfo() {
    startTransition(async () => {
      const res = await call(() => saveClassInfo(infoPayload(vals)))
      if (res.error) fail(res.error)
      else ok()
    })
  }

  function pickTheme(key: ThemeKey) {
    if (key === theme) return
    const before = theme
    setTheme(key)
    startTransition(async () => {
      const res = await call(() => saveClassInfo({ theme: key }), () => setTheme(before))
      if (res.error) {
        setTheme(before)
        fail(res.error)
      } else ok()
    })
  }

  function flip(key: FlagKey, next: boolean) {
    setS((p) => ({ ...p, [key]: next }))
    startTransition(async () => {
      const res = await call(() => saveClassSettings({ [key]: next }), () => setS((p) => ({ ...p, [key]: !next })))
      if (res.error) {
        setS((p) => ({ ...p, [key]: !next }))
        fail(res.error)
      } else ok()
    })
  }

  function saveLimit() {
    const n = Number(limit.trim() === '' ? NaN : limit)
    if (n === s.weekly_redeem_limit) return
    if (!Number.isInteger(n)) {
      setLimit(String(s.weekly_redeem_limit))
      fail(toVietnameseMessage('invalid_redeem_limit'))
      return
    }
    startTransition(async () => {
      const res = await call(() => saveClassSettings({ weekly_redeem_limit: n }))
      if (res.error) {
        setLimit(String(s.weekly_redeem_limit))
        fail(res.error)
      } else {
        setS((p) => ({ ...p, weekly_redeem_limit: n }))
        ok()
      }
    })
  }

  function saveSteps(next: number[], after?: () => void) {
    const before = s.star_steps
    setS((p) => ({ ...p, star_steps: next }))
    startTransition(async () => {
      const res = await call(() => saveClassSettings({ star_steps: next }), () => setS((p) => ({ ...p, star_steps: before })))
      if (res.error) {
        setS((p) => ({ ...p, star_steps: before }))
        fail(res.error)
      } else {
        ok()
        after?.()
      }
    })
  }

  function confirmStep() {
    const n = parseStepInput(stepText)
    if (n === null) {
      fail(toVietnameseMessage('invalid_star_steps'))
      return
    }
    saveSteps(addStep(s.star_steps, n), () => {
      setAdding(false)
      setStepText('')
    })
  }

  function saturday(next: boolean, clear: boolean) {
    startTransition(async () => {
      const res = await call(() => setSaturday(next, clear))
      setAskSaturday(false)
      if (res.error) {
        fail(res.error)
        // Số tiết thứ Bảy đã đổi từ nơi khác: lấy lại số mới để lần bấm sau mở hộp hỏi đúng số.
        if (res.error === toVietnameseMessage('saturday_has_slots')) router.refresh()
      } else {
        setS((p) => ({ ...p, timetable_saturday: next }))
        ok()
      }
    })
  }

  function onSaturday(next: boolean) {
    if (!next && saturdaySlots > 0) setAskSaturday(true)
    else saturday(next, false)
  }

  function onFile(kind: UploadKind, maxSide: number, file: File | undefined) {
    const ref = fileRefs.current[kind]
    if (!file) return
    const check = validateImageFile(file)
    if (!check.ok) {
      fail(toVietnameseMessage(check.error))
      if (ref) ref.value = ''
      return
    }
    startTransition(async () => {
      try {
        const small = await compressImage(file, maxSide)
        const recheck = validateImageFile(small, MAX_UPLOAD_BYTES)
        if (!recheck.ok) {
          fail(toVietnameseMessage(recheck.error))
        } else {
          const form = new FormData()
          form.set('kind', kind)
          form.set('file', small)
          const res = await call(() => uploadBranding(form))
          if (res.error) fail(res.error)
          else ok()
        }
      } catch {
        fail(toVietnameseMessage('upload_failed'))
      }
      if (ref) ref.value = ''
    })
  }

  const switchRow = (key: FlagKey, label: string, hint?: string) => (
    <div key={key} className={row}>
      <Switch checked={s[key]} onChange={(next) => flip(key, next)} label={label} hint={hint} disabled={pending} />
    </div>
  )

  return (
    <>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <section className={card} aria-labelledby="info-h">
        <h2 id="info-h" className={h2}>
          Thông tin lớp
        </h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {INFO_FIELDS.map(([k, label]) => (
            <label key={k} className={fieldLabel}>
              {label}
              <input
                type="text"
                value={vals[k]}
                disabled={pending}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                className={input}
              />
            </label>
          ))}
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {TERM_FIELDS.map(([k, label]) => (
            <label key={k} className={fieldLabel}>
              {label}
              <input
                type="date"
                value={vals[k]}
                disabled={pending}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                className={input}
              />
            </label>
          ))}
        </div>
        <p className="m-0 text-[13.5px] text-muted">
          Mỗi năm học cô cập nhật ngày học kỳ để bảng xếp hạng và nhiệm vụ theo học kỳ tính đúng.
        </p>
        <div className={row}>
          <Switch
            checked={s.timetable_saturday}
            onChange={onSaturday}
            label="Lớp học thứ Bảy"
            disabled={pending}
          />
        </div>
        <div>
          <Button onClick={saveInfo} disabled={pending}>
            Lưu thông tin
          </Button>
        </div>
      </section>

      <section className={card} aria-labelledby="look-h">
        <h2 id="look-h" className={h2}>
          Logo, ảnh bìa và màu giao diện
        </h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {UPLOADS.map(([kind, label, testId, maxSide]) => (
            <div key={kind}>
              <input
                ref={(el) => {
                  fileRefs.current[kind] = el
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                data-testid={testId}
                tabIndex={-1}
                aria-hidden="true"
                className="hidden"
                onChange={(e) => onFile(kind, maxSide, e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => fileRefs.current[kind]?.click()}
                className="flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[20px] border-2 border-dashed border-[#8E86D8] bg-bg p-2.5 text-center text-sm font-extrabold text-primary-ink disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
              >
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
                </svg>
                {label}
              </button>
            </div>
          ))}
        </div>
        <div className="text-sm font-extrabold text-[#4A476E]">Màu chủ đạo</div>
        <div className="flex flex-wrap gap-2.5">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const t = THEMES[key]
            const on = key === theme
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                disabled={pending}
                onClick={() => pickTheme(key)}
                className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-2 bg-white py-0 pl-2 pr-4 text-sm font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong ${
                  on ? 'border-ink' : 'border-[#E4E0F7]'
                }`}
              >
                <span className="size-8 rounded-full" style={{ background: t.primary }} />
                {t.label}
              </button>
            )
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-stretch gap-4">
        <section className={`${card} min-w-0 flex-[1_1_380px]`} aria-labelledby="rules-h">
          <h2 id="rules-h" className={h2}>
            Quy định thi đua và đổi quà
          </h2>
          {RULES.map(([k, label, hint]) => switchRow(k, label, hint))}
          <p className="m-0 text-[13.5px] text-muted">
            Khi &quot;Giữ trước sao&quot; bật, học sinh luôn cần đủ sao để gửi yêu cầu. &quot;Chỉ cho đổi khi đủ sao&quot; chỉ có tác dụng khi &quot;Giữ trước sao&quot; tắt.
          </p>
          <label className="flex flex-wrap items-center gap-2 text-[14.5px] font-extrabold text-[#4A476E]">
            Tối đa lượt đổi quà mỗi tuần
            <input
              type="number"
              value={limit}
              disabled={pending}
              onChange={(e) => setLimit(e.target.value)}
              onBlur={saveLimit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className={`${input} w-[84px] px-2.5`}
            />
          </label>
          <div className="text-sm font-extrabold text-[#4A476E]">Mức sao gợi ý (cộng)</div>
          <div className="flex flex-wrap items-center gap-2">
            {s.star_steps.map((n) => (
              <button
                key={n}
                type="button"
                disabled={pending}
                aria-label={`Xóa mức +${n}`}
                onClick={() => saveSteps(removeStep(s.star_steps, n))}
                className="min-h-11 min-w-14 cursor-pointer rounded-xl border-2 border-[#E0A020] bg-[#FFF1CC] px-3 text-[15px] font-extrabold text-[#4A3300] disabled:cursor-not-allowed disabled:opacity-50"
              >
                +{n} ×
              </button>
            ))}
            {adding ? (
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  aria-label="Mức sao mới"
                  value={stepText}
                  autoFocus
                  disabled={pending}
                  onChange={(e) => setStepText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmStep()
                    if (e.key === 'Escape') {
                      setAdding(false)
                      setStepText('')
                    }
                  }}
                  className={`${input} w-[84px] px-2.5`}
                />
                <Button onClick={confirmStep} disabled={pending}>
                  Thêm
                </Button>
              </span>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => setAdding(true)}
                className="min-h-11 cursor-pointer rounded-xl border-2 border-dashed border-[#8E86D8] bg-white px-3.5 text-sm font-extrabold text-primary-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Thêm mức
              </button>
            )}
          </div>
          <Link href="/thi-dua" className="text-[14.5px] font-extrabold text-primary-strong">
            Sửa tiêu chí cộng/trừ sao ở Trạm thi đua
          </Link>
        </section>

        <section className={`${card} min-w-0 flex-[1_1_380px]`} aria-labelledby="feat-h">
          <h2 id="feat-h" className={h2}>
            Bật/tắt tính năng
          </h2>
          {FEATURES.map(([k, label, hint]) => switchRow(k, label, hint))}
          <h2 className={`${h2} mt-2.5`}>Học sinh được xem</h2>
          {VIEWS.map(([k, label]) => switchRow(k, label))}
        </section>
      </div>

      <Modal
        open={askSaturday}
        onClose={() => {
          if (!pending) setAskSaturday(false)
        }}
        title={`Thời khóa biểu còn ${saturdaySlots} tiết thứ Bảy. Cô muốn xóa các tiết này và tắt học thứ Bảy?`}
      >
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={() => setAskSaturday(false)} disabled={pending}>
            Hủy
          </Button>
          <Button variant="danger" onClick={() => saturday(false, true)} disabled={pending}>
            Xóa và tắt
          </Button>
        </div>
      </Modal>
    </>
  )
}
