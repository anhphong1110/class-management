'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { Switch } from '@/components/ui/Switch'
import { buildPool, pickNext } from '@/lib/random/pick'
import { rewardRandom } from './actions'

type StudentView = {
  id: string
  fullName: string
  code: string
  avatar: AvatarValue
  groupId: string | null
  groupName: string | null
  presentToday: boolean
}
type GroupView = { id: string; name: string }
type Msg = { text: string; error: boolean } | null

const ALL_CALLED_MSG = 'Cả nhóm đã được gọi hết. Cô bấm "Bắt đầu vòng mới" nhé.'
const STEPS = 20

function storageKey(today: string) {
  return `goi-ten:${today}`
}

function loadCalled(today: string): string[] {
  try {
    const raw = window.sessionStorage.getItem(storageKey(today))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function saveCalled(today: string, called: string[]) {
  try {
    window.sessionStorage.setItem(storageKey(today), JSON.stringify(called))
  } catch {
    // Trình duyệt chặn sessionStorage: vòng gọi chỉ giữ trong trang này.
  }
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function RandomClient({ today, students, groups }: { today: string; students: StudentView[]; groups: GroupView[] }) {
  const [scope, setScope] = useState<'all' | string>('all')
  const [noRepeat, setNoRepeat] = useState(true)
  const [onlyPresent, setOnlyPresent] = useState(true)
  const [called, setCalled] = useState<string[]>([])
  const [curId, setCurId] = useState<string | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [pop, setPop] = useState(0)
  const [rewarded, setRewarded] = useState(false)
  const [pending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCalled(loadCalled(today))
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [today])

  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  const pool = useMemo(
    () => buildPool(students.map((s) => ({ id: s.id, groupId: s.groupId, presentToday: s.presentToday })), { scope, onlyPresent }),
    [students, scope, onlyPresent],
  )
  const cur = curId ? (byId.get(curId) ?? null) : null
  const calledList = called.map((id) => byId.get(id)).filter((s): s is StudentView => !!s)
  const calledInPool = called.filter((id) => pool.includes(id)).length

  const commitCalled = useCallback(
    (next: string[]) => {
      setCalled(next)
      saveCalled(today, next)
    },
    [today],
  )

  function clearStage() {
    setRewarded(false)
    setCurId(null)
    setResult(false)
    setMsg(null)
  }

  function spin() {
    if (spinning) return
    const target = pickNext(pool, called, noRepeat, Math.random)
    if (target === null) {
      setResult(false)
      setMsg({ text: ALL_CALLED_MSG, error: false })
      return
    }
    const finish = () => {
      setSpinning(false)
      setResult(true)
      setCurId(target)
      setPop((n) => n + 1)
      commitCalled(called.includes(target) ? called : [...called, target])
    }
    setMsg(null)
    setResult(false)
    setRewarded(false)
    // Giảm chuyển động: dừng ngay, không quay.
    if (reducedMotion()) {
      finish()
      return
    }
    setSpinning(true)
    let k = 0
    const tick = () => {
      k++
      if (k >= STEPS) {
        finish()
        return
      }
      setCurId(pool[Math.floor(Math.random() * pool.length)])
      timer.current = setTimeout(tick, 60 + k * 9)
    }
    tick()
  }

  function reward() {
    if (!cur || pending) return
    startTransition(async () => {
      const r = await rewardRandom(cur.id)
      if (!r.error) setRewarded(true)
      setMsg(r.error ? { text: r.error, error: true } : { text: r.message ?? '', error: false })
    })
  }

  function resetRound() {
    if (timer.current) clearTimeout(timer.current)
    setSpinning(false)
    commitCalled([])
    clearStage()
  }

  const scopes: [string, string][] = [['all', 'Cả lớp'], ...groups.map((g): [string, string] => [g.id, g.name])]
  const toggles = [
    { label: 'Không gọi lại bạn đã được gọi', on: noRepeat, flip: () => setNoRepeat(!noRepeat) },
    {
      label: 'Chỉ gọi bạn có mặt hôm nay',
      on: onlyPresent,
      flip: () => {
        setOnlyPresent(!onlyPresent)
        setCurId(null)
        setResult(false)
      },
    },
  ]

  return (
    <>
      <Card className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          <div className="text-[15px] font-extrabold text-ink">Gọi trong phạm vi</div>
          <div className="flex flex-wrap gap-2">
            {scopes.map(([id, label]) => {
              const on = scope === id
              return (
                <Button
                  key={id}
                  variant={on ? 'primary' : 'secondary'}
                  className="!rounded-full"
                  aria-pressed={on}
                  disabled={spinning}
                  onClick={() => {
                    setScope(id)
                    clearStage()
                  }}
                >
                  {label}
                </Button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {toggles.map((t) => (
            <div key={t.label} className="rounded-ctl border-2 border-edge bg-field px-4">
              <Switch checked={t.on} onChange={t.flip} label={t.label} disabled={spinning} />
            </div>
          ))}
        </div>
      </Card>

      <div className="clay-card relative flex flex-col items-center gap-3.5 overflow-hidden bg-[linear-gradient(160deg,#DDEBFF_0%,#EBE3FF_60%,#FFE9F3_100%)] px-6 pb-8 pt-9 text-center">
        <svg viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true" className="absolute left-0 top-0 h-full w-full">
          <g className="motion-safe:[animation:tw_3s_ease-in-out_infinite]">
            <circle cx="90" cy="50" r="4" fill="#FFC93C" />
            <circle cx="300" cy="320" r="3" fill="#B9A7F8" />
            <circle cx="700" cy="60" r="4" fill="#FF6FAE" />
            <circle cx="900" cy="300" r="3.5" fill="#FFC93C" />
            <circle cx="560" cy="360" r="3" fill="#5EDCC5" />
          </g>
        </svg>
        <div aria-live="polite" className="relative text-sm font-extrabold tracking-[0.16em] text-primary-deep">
          {spinning ? 'ĐANG QUAY...' : result ? 'PHI HÀNH GIA MAY MẮN' : 'SẴN SÀNG QUAY'}
        </div>
        <div
          key={pop}
          className={`relative flex h-[230px] w-[230px] items-center justify-center rounded-full border-4 border-white bg-white/70 shadow-[0_6px_0_#CFE3FF] ${result ? 'pop' : ''}`}
        >
          {cur ? (
            <AvatarImage avatar={cur.avatar} size={196} crown={result} />
          ) : (
            <svg viewBox="0 0 24 24" width="96" height="96" aria-hidden="true">
              <polygon points="12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9" fill="#FFC857" stroke="#E0A020" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div
          data-testid="current-name"
          className="relative min-h-[56px] break-words font-display text-[44px] font-extrabold leading-[1.1] text-ink sm:text-[64px] sm:min-h-[72px]"
        >
          {cur ? cur.fullName : 'Bấm quay để chọn'}
        </div>
        <div data-testid="current-meta" className="relative min-h-[24px] text-lg font-bold text-muted">
          {cur ? `${cur.groupName ?? 'Chưa có tổ'} · Mã ${cur.code}` : ''}
        </div>
        <div className="relative mt-2 flex flex-wrap justify-center gap-4">
          <Button
            variant="accent"
            onClick={spin}
            disabled={spinning}
            className="!min-h-[76px] !rounded-card !px-12 !text-2xl"
          >
            <Icon d={ICONS.rocket} size={30} />
            {spinning ? 'Đang quay...' : result ? 'Gọi bạn tiếp theo' : 'Quay số'}
          </Button>
          {result && !spinning && cur ? (
            <Button
              variant="secondary"
              size="lg"
              onClick={reward}
              disabled={pending || rewarded}
              className="!min-h-[76px] !rounded-card !px-8"
            >
              <Icon d={ICONS.star} size={24} />
              +1 sao cho bạn này
            </Button>
          ) : null}
        </div>
        {msg ? (
          <div className="relative text-left">
            <Notice tone={msg.error ? 'error' : 'info'}>{msg.text}</Notice>
          </div>
        ) : null}
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="m-0 font-display text-[22px] font-extrabold">
            Đã được gọi ({calledInPool}/{pool.length})
          </h2>
          <Button variant="secondary" onClick={resetRound}>
            <Icon d={ICONS.undo} size={18} />
            Bắt đầu vòng mới
          </Button>
        </div>
        <div data-testid="called-list" className="flex flex-wrap gap-2">
          {calledList.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-2 rounded-full bg-primary-soft py-1 pl-1 pr-3.5 text-sm font-bold text-primary-deep">
              <AvatarImage avatar={s.avatar} size={32} />
              {s.fullName}
            </span>
          ))}
          {calledList.length === 0 ? <span className="text-[15px] font-semibold text-muted">Chưa gọi bạn nào trong vòng này.</span> : null}
        </div>
      </Card>
    </>
  )
}
