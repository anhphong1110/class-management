'use client'

import { useRef, useState, useTransition } from 'react'
import { RewardVisual } from '@/components/rewards/RewardVisual'
import { compressImage } from '@/lib/domain/compress-image'
import { validateImageFile } from '@/lib/domain/upload'
import { toVietnameseMessage } from '@/lib/errors'
import { REWARD_PRESETS } from '@/lib/rewards/presets'
import type { RewardView } from '@/lib/rewards/queries'
import { saveReward, setRewardStock, uploadRewardImage } from './actions'

const field =
  'min-h-12 box-border rounded-xl border-2 border-[#B9B5E8] bg-white px-3 text-base font-bold text-ink'

/** `reward` rỗng là thêm mới. Bấm "Xong" mới lưu mọi thay đổi (tên, giá, kho, hình). */
export function RewardEditor({ reward, onClose }: { reward: RewardView | null; onClose: () => void }) {
  const [name, setName] = useState(reward?.name ?? '')
  const [cost, setCost] = useState(reward ? String(reward.cost) : '')
  const [stock, setStock] = useState(reward ? String(reward.stock) : '0')
  const [icon, setIcon] = useState<string>(reward?.visual.kind === 'preset' ? reward.visual.key : 'star')
  const [file, setFile] = useState<File | null>(null)
  const [clearImage, setClearImage] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const existingImage = reward?.visual.kind === 'image' && !clearImage ? reward.visual.url : null
  const shownImage = preview ?? existingImage

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
    const check = validateImageFile(f)
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
    const stockNum = Number.parseInt(stock, 10)
    if (!name.trim() || !(costNum > 0) || !(stockNum >= 0)) {
      setMsg(toVietnameseMessage('invalid_input'))
      return
    }
    startTransition(async () => {
      try {
        const saved = await saveReward({
          id: reward?.id,
          name,
          cost: costNum,
          description: reward?.description ?? '',
          icon,
          clearImage: clearImage || undefined,
        })
        if (saved.error || !saved.id) {
          setMsg(saved.error ?? toVietnameseMessage('invalid_input'))
          return
        }
        if (!reward || stockNum !== reward.stock) {
          const st = await setRewardStock(saved.id, stockNum)
          if (st.error) {
            setMsg(st.error)
            return
          }
        }
        if (file) {
          const small = await compressImage(file)
          const form = new FormData()
          form.set('id', saved.id)
          form.set('file', small)
          const up = await uploadRewardImage(form)
          if (up.error) {
            setMsg(up.error)
            return
          }
        }
        onClose()
      } catch {
        setMsg(toVietnameseMessage('upload_failed'))
      }
    })
  }

  return (
    <div
      role="region"
      aria-label="Sửa phần thưởng"
      className="flex flex-wrap gap-5 rounded-[28px] border-2 border-primary-strong bg-[#EEF0FF] px-6 py-[22px]"
    >
      <div className="flex flex-none flex-col items-center gap-2.5">
        {shownImage ? (
          <RewardVisual visual={{ kind: 'image', url: shownImage }} iconSize={84} className="h-40 w-[200px] rounded-[22px]" />
        ) : (
          <RewardVisual visual={{ kind: 'preset', key: icon }} iconSize={84} className="h-40 w-[200px] rounded-[22px]" />
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
            <input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
          <label className="flex flex-[1_1_110px] flex-col gap-1 text-sm font-extrabold text-[#4A476E]">
            Giá (sao)
            <input type="number" min={1} value={cost} onChange={(e) => setCost(e.target.value)} className={field} />
          </label>
          <label className="flex flex-[1_1_110px] flex-col gap-1 text-sm font-extrabold text-[#4A476E]">
            Số lượng trong kho
            <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className={field} />
          </label>
        </div>
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
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={done}
            className="min-h-12 cursor-pointer rounded-[14px] border-0 bg-primary-strong px-[26px] text-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  )
}
