'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RewardVisual } from '@/components/rewards/RewardVisual'
import { Button } from '@/components/ui/Button'
import { RARITY_COLORS } from '@/lib/blind-bag/odds'
import type { BlindBagScene } from './scene'
import type { RevealGift } from './types'

export type TearResult = { gift: RevealGift; error?: undefined } | { error: string; gift?: undefined }

type Stage = 'loading' | 'ready' | 'tearing' | 'revealed' | 'fallback' | 'fallback-revealed'

const ASSETS = { front: '/blind-bag/bag-front.webp', back: '/blind-bag/bag-back.webp', cardBack: '/blind-bag/card-back.webp' }

function canWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * Màn xé túi mù. Kết quả do máy chủ bốc khi em xé xong (onTear), nên đóng giữa chừng trước khi xé không mất sao.
 * `onTear` chạy đúng một lần; lỗi thì đóng màn và báo qua `onError`.
 */
export function BlindBagStage({
  open,
  onTear,
  onClose,
  onError,
}: {
  open: boolean
  onTear: () => Promise<TearResult>
  /** Đóng màn. `opened` = đã mở túi thật (cần làm mới danh sách yêu cầu). */
  onClose: (opened: boolean) => void
  onError: (message: string) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<BlindBagScene | null>(null)
  const tornRef = useRef(false)
  const [stage, setStage] = useState<Stage>('loading')
  const [gift, setGift] = useState<RevealGift | null>(null)
  // Giữ callback mới nhất trong ref để cha truyền hàm inline cũng không làm dựng lại cả cảnh 3D.
  const cb = useRef({ onTear, onClose, onError })
  useEffect(() => {
    cb.current = { onTear, onClose, onError }
  })

  const runTear = useCallback(async (): Promise<RevealGift | null> => {
    if (tornRef.current) return null
    tornRef.current = true
    const res = await cb.current.onTear()
    if (res.error !== undefined) {
      cb.current.onError(res.error)
      cb.current.onClose(false)
      return null
    }
    setGift(res.gift)
    return res.gift
  }, [])

  useEffect(() => {
    if (!open) return
    tornRef.current = false
    setStage('loading')
    setGift(null)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || !canWebGL()) {
      setStage('fallback')
      return
    }
    let cancelled = false
    let scene: BlindBagScene | null = null
    ;(async () => {
      try {
        const { BlindBagScene } = await import('./scene')
        if (cancelled || !hostRef.current) return
        scene = new BlindBagScene(
          hostRef.current,
          {
            onTorn: () => {
              setStage('tearing')
              void runTear().then((g) => {
                if (g) void scene?.reveal(g)
              })
            },
            onRevealed: () => setStage('revealed'),
          },
          ASSETS,
        )
        await scene.init()
        if (cancelled) {
          scene.dispose()
          return
        }
        sceneRef.current = scene
        setStage('ready')
      } catch {
        scene?.dispose()
        sceneRef.current = null
        if (!cancelled) setStage('fallback')
      }
    })()
    const ro = new ResizeObserver(() => sceneRef.current?.resize())
    if (hostRef.current) ro.observe(hostRef.current)
    return () => {
      cancelled = true
      ro.disconnect()
      scene?.dispose()
      sceneRef.current = null
    }
  }, [open, runTear])

  const close = useCallback(() => cb.current.onClose(tornRef.current), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !tornRef.current) close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  if (!open || typeof document === 'undefined') return null

  const canClose = stage === 'ready' || stage === 'fallback' || stage === 'revealed' || stage === 'fallback-revealed'
  const done = stage === 'revealed' || stage === 'fallback-revealed'
  const accent = RARITY_COLORS[Math.min(gift?.tier ?? 0, 4)]

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Túi mù"
      data-testid="blind-bag-stage"
      data-stage={stage}
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 35%, var(--color-navy-to) 0%, var(--color-navy-from) 55%, color-mix(in srgb, var(--color-navy-from) 60%, black) 100%)' }}
      onPointerDown={() => sceneRef.current?.speedUp()}
    >
      <div ref={hostRef} className="absolute inset-0" hidden={stage === 'fallback' || stage === 'fallback-revealed'} />

      {canClose && (
        <button
          type="button"
          onClick={close}
          aria-label="Đóng"
          className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border-2 border-white/30 bg-white/15 text-2xl font-extrabold text-white"
        >
          ×
        </button>
      )}

      {stage === 'fallback' && (
        <div className="relative z-10 m-auto flex flex-col items-center gap-5 px-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.front} alt="Túi mù" className="h-[46vh] max-h-[420px] w-auto" />
          <Button
            size="lg"
            onClick={() => {
              setStage('tearing')
              void runTear().then((g) => setStage(g ? 'fallback-revealed' : 'fallback'))
            }}
          >
            Xé túi
          </Button>
        </div>
      )}

      {stage === 'fallback-revealed' && gift && (
        <div className="relative z-10 m-auto flex flex-col items-center gap-4 px-6 text-center">
          <div className="pop overflow-hidden rounded-card border-[6px] bg-field p-3" style={{ borderColor: accent }}>
            <RewardVisual visual={gift.visual} iconSize={96} className="h-[220px] w-[240px] rounded-panel" />
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
        {stage === 'loading' && <p className="m-0 font-display text-xl font-bold text-white/90">Đang chuẩn bị túi…</p>}
        {stage === 'ready' && (
          <>
            <p className="m-0 font-display text-2xl font-extrabold text-white" data-testid="blind-bag-hint">
              Vuốt ngang qua đỉnh túi để xé!
            </p>
            <button
              type="button"
              onClick={() => sceneRef.current?.tearNow()}
              className="pointer-events-auto rounded-ctl border-2 border-white/30 bg-white/10 px-4 py-2 text-base font-bold text-white"
            >
              Không vuốt được? Bấm để xé
            </button>
          </>
        )}
        {stage === 'tearing' && <p className="m-0 font-display text-xl font-bold text-white/90">Đang mở túi…</p>}
        {done && gift && (
          <>
            <p className="m-0 font-display text-2xl font-extrabold text-white" data-testid="blind-bag-result">
              Em nhận được: {gift.name}!
            </p>
            <p className="m-0 text-base font-semibold text-white/80">Cô sẽ trao quà cho em nhé.</p>
            <Button size="lg" className="pointer-events-auto" onClick={close}>
              Xong
            </Button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
