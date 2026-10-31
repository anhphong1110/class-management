'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { RewardVisual } from '@/components/rewards/RewardVisual'
import { compressImage } from '@/lib/domain/compress-image'
import { validateImageFile } from '@/lib/domain/upload'
import { toVietnameseMessage } from '@/lib/errors'
import { REWARD_PRESETS } from '@/lib/rewards/presets'
import type { RewardView } from '@/lib/rewards/queries'
import { saveReward, setRewardStock, uploadRewardImage } from './actions'

const field =
  'min-h-12 box-border rounded-xl border-2 border-[#B9B5E8] bg-white px-3 text-base font-bold text-ink'

/** `reward` rỗng là thêm mới. Bấm "Xong" mới lưu; "Hủy" hoặc Esc đóng mà không lưu. */
export function RewardEditor({ reward, onClose }: { reward: RewardView | null; onClose: () => void }) {
  const [name, setName] = useState(reward?.name ?? '')
  const [cost, setCost] = useState(reward ? String(reward.cost) : '')
  const [stock, setStock] = useState(reward ? String(reward.stock) : '')
  const [description, setDescription] = useState(reward?.description ?? '')
  const [icon, setIcon] = useState<string | null>(reward ? reward.icon : 'star')
  const [file, setFile] = useState<File | null>(null)
  const [clearImage, setClearImage] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const regionRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  // Quà vừa tạo: mọi lần bấm "Xong" sau đó (thử lại) cập nhật chính nó, không tạo thêm.
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [savedStock, setSavedStock] = useState<number | null>(reward ? reward.stock : null)

  const held = reward?.held ?? 0
  const existingImage = reward?.visual.kind === 'image' && !clearImage ? reward.visual.url : null
  const shownImage = preview ?? existingImage

  useEffect(() => {
    regionRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    nameRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  function pickPreset(key: string) {
    setIcon(key)
    setFile(null)
    setPreview(null)
    setClearImage(true)
    setMsg(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function onFile(f: File | undefined) {
    if (!f) return
    // Chỉ kiểm loại ở đây; kích thước kiểm sau khi nén (ảnh chụp điện thoại thường lớn).
    const check = validateImageFile({ size: 0, type: f.type })
    if (!check.ok) {
      setMsg(toVietnameseMessage(check.error))
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setMsg(null)
    setFile(f)
    setClearImage(false)
    setPreview(URL.createObjectURL(f))
  }

  function done() {
    const costNum = Number.parseInt(cost, 10)
    const stockNum = stock.trim() === '' ? Number.NaN : Number(stock)
    if (!name.trim() || !(costNum > 0) || !Number.isInteger(stockNum) || stockNum < 0) {
      setMsg(toVietnameseMessage('invalid_input'))
      return
    }
    if (stockNum < held) {
      setMsg(toVietnameseMessage('stock_below_held'))
      return
    }
    startTransition(async () => {
      let saved = ''
      try {
        const id = reward?.id ?? createdId
        const res = await saveReward({
          id: id ?? undefined,
          name,
          cost: costNum,
          description,
          icon,
          clearImage: clearImage || undefined,
          stock: id ? undefined : stockNum,
        })
        if (res.error || !res.id) {
          setMsg(res.error ?? toVietnameseMessage('invalid_input'))
          return
        }
        const rewardId = res.id
        if (!id) {
          setCreatedId(rewardId)
          setSavedStock(stockNum)
        }
        saved = id ? 'tên, giá và mô tả' : 'quà mới'
        if (id && stockNum !== savedStock) {
          const st = await setRewardStock(rewardId, stockNum)
          if (st.error) {
            setMsg(`Đã lưu ${saved}; ${st.error}`)
            return
          }
          setSavedStock(stockNum)
          saved = 'tên, giá, mô tả và số lượng'
        }
        if (file) {
          let small: File
          try {
            small = await compressImage(file)
          } catch {
            setMsg(`Đã lưu ${saved}; ${toVietnameseMessage('upload_failed')}`)
            return
          }
          const check = validateImageFile(small)
          if (!check.ok) {
            setMsg(`Đã lưu ${saved}; ${toVietnameseMessage(check.error)}`)
            return
          }
          try {
            const form = new FormData()
            form.set('id', rewardId)
            form.set('file', small)
            const up = await uploadRewardImage(form)
            if (up.error) {
              setMsg(`Đã lưu ${saved}; ${up.error}`)
              return
            }
          } catch {
            setMsg(`Đã lưu ${saved}; ${toVietnameseMessage('upload_failed')}`)
            return
          }
        }
        onClose()
      } catch {
        setMsg(saved ? `Đã lưu ${saved}; ${toVietnameseMessage('unknown')}` : toVietnameseMessage('unknown'))
      }
    })
  }

  return (
    <div
      ref={regionRef}
      role="region"
      aria-label="Sửa phần thưởng"
      className="flex flex-wrap gap-5 rounded-[28px] border-2 border-primary-strong bg-[#EEF0FF] px-6 py-[22px]"
    >
      <div className="flex flex-none flex-col items-center gap-2.5">
        {shownImage ? (
          <RewardVisual visual={{ kind: 'image', url: shownImage }} iconSize={84} className="h-40 w-[200px] rounded-[22px]" />
        ) : (
          <RewardVisual visual={{ kind: 'preset', key: icon ?? 'star' }} iconSize={84} className="h-40 w-[200px] rounded-[22px]" />
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="min-h-12 w-[200px] cursor-pointer rounded-[14px] border-2 border-dashed border-primary-strong bg-white text-sm font-extrabold text-[#3441B5]"
        >
          Tải ảnh quà lên
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
        <div className="font-display text-[22px] font-extrabold">Sửa phần thưởng</div>
        <div className="flex flex-wrap gap-2.5">
          <label className="flex flex-[2_1_200px] flex-col gap-1 text-sm font-extrabold text-[#4A476E]">
            Tên quà
            <input ref={nameRef} type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
          <label className="flex flex-[1_1_110px] flex-col gap-1 text-sm font-extrabold text-[#4A476E]">
            Giá (sao)
            <input type="number" min={1} value={cost} onChange={(e) => setCost(e.target.value)} className={field} />
          </label>
          <div className="flex flex-[1_1_130px] flex-col gap-1">
            <label className="flex flex-col gap-1 text-sm font-extrabold text-[#4A476E]">
              Số lượng trong kho
              <input type="number" min={held} required value={stock} onChange={(e) => setStock(e.target.value)} className={field} />
            </label>
            {reward && <span className="text-xs font-bold text-muted">Đang giữ {held} (kho không được ít hơn)</span>}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm font-extrabold text-[#4A476E]">
          Mô tả
          <textarea
            value={description}
            maxLength={200}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl border-2 border-[#B9B5E8] bg-white px-3 py-2 text-base font-bold text-ink"
          />
        </label>
        <div className="text-sm font-extrabold text-[#4A476E]">Hoặc chọn hình có sẵn</div>
        <div className="flex flex-wrap gap-2">
          {REWARD_PRESETS.map((p) => {
            const on = !shownImage && icon === p.key
            return (
              <button
                key={p.key}
                type="button"
                aria-label={p.label}
                aria-pressed={on}
                onClick={() => pickPreset(p.key)}
                className={`flex size-16 cursor-pointer items-center justify-center rounded-2xl border-[3px] ${on ? 'border-ink' : 'border-transparent'}`}
                style={{ background: p.gradient }}
              >
                <svg viewBox="0 0 24 24" width="30" height="30" fill="rgba(255,255,255,.28)" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={p.path} />
                </svg>
              </button>
            )
          })}
        </div>
        {msg && (
          <div role="alert" className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-[#8E1B3B]">
            {msg}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={done}
            className="min-h-12 cursor-pointer rounded-[14px] border-0 bg-primary-strong px-[26px] text-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Xong
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-12 cursor-pointer rounded-[14px] border-2 border-primary-strong bg-white px-[22px] text-[15px] font-extrabold text-[#3441B5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}
