'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { compressImage } from '@/lib/domain/compress-image'
import type { ThemeKey } from '@/lib/domain/theme'
import { MAX_UPLOAD_BYTES, validateImageFile } from '@/lib/domain/upload'
import { toVietnameseMessage } from '@/lib/errors'
import { addStep, infoPayload, parseStepInput, removeStep, type InfoValues } from '@/lib/settings/form'
import type { SettingsClass, SettingsData, SettingsFlags } from '@/lib/settings/queries'
import { clearBranding, saveClassInfo, saveClassSettings, setSaturday, uploadBranding } from './actions'
import { BrandingSection } from './settings/BrandingSection'
import { ClassInfoSection } from './settings/ClassInfoSection'
import { FeaturesSection } from './settings/FeaturesSection'
import { RulesSection } from './settings/RulesSection'
import type { FlagKey, Msg, UploadKind } from './settings/shared'

const SAVED = 'Đã lưu cài đặt.'

function toInfo(c: SettingsClass): InfoValues {
  return {
    school_name: c.school_name,
    class_name: c.class_name,
    brand_title: c.brand_title ?? '',
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

  function onClear(kind: UploadKind) {
    startTransition(async () => {
      const res = await call(() => clearBranding(kind))
      if (res.error) fail(res.error)
      else ok()
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border-2 border-edge bg-primary-soft px-5 py-3">
        <p className="m-0 flex-1 basis-64 text-[15px] font-bold text-primary-deep">
          Muốn biết học sinh nhìn thấy gì sau khi cô đổi cài đặt? Cô xem thử rồi quay lại nhé.
        </p>
        <ButtonLink href="/em" variant="secondary">
          <Icon d={ICONS.eye} size={20} />
          Xem như học sinh
        </ButtonLink>
      </div>

      {msg && (
        <div className="sticky top-3 z-30 rounded-ctl shadow-[0_8px_20px_-8px_rgba(35,31,77,0.35)]">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}

      <ClassInfoSection
        vals={vals}
        setVals={setVals}
        saturdayOn={s.timetable_saturday}
        pending={pending}
        onSaturday={onSaturday}
        onSave={saveInfo}
      />

      <BrandingSection fileRefs={fileRefs} cls={cls} theme={theme} pending={pending} onFile={onFile} onClear={onClear} onPickTheme={pickTheme} />

      <div className="flex flex-wrap items-stretch gap-4">
        <RulesSection
          settings={s}
          pending={pending}
          onFlip={flip}
          limit={limit}
          setLimit={setLimit}
          onSaveLimit={saveLimit}
          steps={{
            steps: s.star_steps,
            adding,
            stepText,
            pending,
            onRemove: (n) => saveSteps(removeStep(s.star_steps, n)),
            onStartAdd: () => setAdding(true),
            onCancelAdd: () => {
              setAdding(false)
              setStepText('')
            },
            onTextChange: setStepText,
            onConfirm: confirmStep,
          }}
        />
        <FeaturesSection settings={s} pending={pending} onFlip={flip} />
      </div>


      <ConfirmDialog
        open={askSaturday}
        title="Tắt học thứ Bảy?"
        message={`Thời khóa biểu còn ${saturdaySlots} tiết thứ Bảy. Cô muốn xóa các tiết này và tắt học thứ Bảy?`}
        confirmLabel="Xóa và tắt"
        cancelLabel="Hủy"
        danger
        pending={pending}
        onCancel={() => {
          if (!pending) setAskSaturday(false)
        }}
        onConfirm={() => saturday(false, true)}
      />
    </>
  )
}
