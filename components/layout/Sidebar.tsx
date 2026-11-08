'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Icon, ICONS } from '@/components/ui/Icon'
import { brandLines } from '@/lib/classes/brand'
import { BrandBlocks, NavIconChip } from './NavParts'
import { TEACHER_NAV, TEACHER_NAV_META } from './nav'

type Props = {
  active?: string
  teacher: { displayName: string; avatar: AvatarValue }
  classLogoUrl: string | null
  schoolLogoUrl?: string | null
  className: string
  brandName?: string | null
  schoolName?: string | null
}

export function Sidebar({ active, teacher, classLogoUrl, schoolLogoUrl, className, brandName, schoolName }: Props) {
  const pathname = usePathname()
  const activeId =
    active ??
    TEACHER_NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.id

  // Dưới lg menu là ngăn kéo trượt từ trái, mở bằng nút ☰ ở thanh trên cùng.
  const [open, setOpen] = useState(false)
  const [lastPath, setLastPath] = useState(pathname)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const brand = brandLines({ class_name: className, brand_title: brandName })

  // Đổi trang (kể cả bấm Back) thì đóng ngăn kéo.
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  const close = () => {
    setOpen(false)
    menuBtnRef.current?.focus()
  }

  // Khi mở: khoá cuộn nền, Esc để đóng, đưa mục đang chọn vào tầm nhìn; khi màn hình rộng ra từ lg thì tự đóng.
  useEffect(() => {
    if (!open) return
    closeBtnRef.current?.focus()
    document.querySelector('#teacher-drawer nav [aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const mq = window.matchMedia('(min-width: 1024px)')
    const onMq = () => {
      if (mq.matches) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [open])

  let lastGroup = ''
  return (
    <>
    {/* Điện thoại và máy tính bảng: thanh trên cố định với nút ☰; chỗ trống bên dưới giữ cho nội dung không bị che. */}
    <div aria-hidden="true" className="h-10 lg:hidden" />
    <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b-2 border-edge bg-white px-3 shadow-[0_6px_16px_-10px_rgba(35,31,77,0.25)] lg:hidden">
      <button
        ref={menuBtnRef}
        type="button"
        aria-label="Mở menu"
        aria-expanded={open}
        aria-controls="teacher-drawer"
        onClick={() => setOpen(true)}
        className="flex size-11 flex-none items-center justify-center rounded-ctl bg-primary-soft text-primary-deep transition-colors hover:bg-primary-soft/70"
      >
        <Icon d="M4 7h16M4 12h16M4 17h16" size={24} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={classLogoUrl ?? '/brand/logo-lop.jpg'}
        alt=""
        className="size-9 flex-none rounded-full border-2 border-edge bg-white object-cover"
      />
      <div className="min-w-0 truncate font-display text-[16px] font-extrabold leading-tight text-ink">
        {brand.top}
        {brand.accent && <span className="text-primary-strong"> {brand.accent}</span>}
      </div>
    </div>
    {open && (
      <button
        type="button"
        aria-label="Đóng menu"
        tabIndex={-1}
        onClick={close}
        className="fixed inset-0 z-[55] cursor-default border-0 bg-ink/40 lg:hidden"
      />
    )}
    <aside
      id="teacher-drawer"
      className={`clay-card box-border flex w-full flex-col gap-[18px] px-3.5 py-5 text-ink lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-[60] max-lg:w-[min(320px,86vw)] max-lg:overflow-y-auto max-lg:rounded-l-none max-lg:border-l-0 max-lg:transition-[transform,visibility] max-lg:duration-200 motion-reduce:transition-none ${
        open ? 'max-lg:visible max-lg:translate-x-0' : 'max-lg:invisible max-lg:-translate-x-full'
      }`}
    >
      <div className="-mb-2 flex items-center justify-between lg:hidden">
        <span className="px-1.5 font-display text-[15px] font-extrabold uppercase tracking-[.08em] text-muted">Menu</span>
        <button
          ref={closeBtnRef}
          type="button"
          aria-label="Đóng menu"
          onClick={close}
          className="flex size-11 items-center justify-center rounded-ctl text-ink transition-colors hover:bg-primary-soft"
        >
          <Icon d={ICONS.x} size={22} />
        </button>
      </div>
      <BrandBlocks
        classLogoUrl={classLogoUrl}
        schoolLogoUrl={schoolLogoUrl}
        className={className}
        brandName={brandName}
        schoolName={schoolName}
      />
      <nav aria-label="Menu chính" className="min-w-0">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {TEACHER_NAV.map((it) => {
            const on = it.id === activeId
            const meta = TEACHER_NAV_META[it.id]
            const heading = meta && meta.group !== lastGroup ? meta.group : null
            if (meta) lastGroup = meta.group
            return (
              <li key={it.id} className="first:[&>div]:pt-0">
                {heading && (
                  <div
                    aria-hidden="true"
                    className="px-3.5 pb-1 pt-3 text-[12px] font-extrabold uppercase tracking-[.08em] text-muted max-lg:hidden"
                  >
                    {heading}
                  </div>
                )}
                <Link
                  href={it.href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-3 whitespace-nowrap rounded-2xl px-2.5 py-1.5 text-[15px] transition-colors ${
                    on
                      ? 'bg-primary-strong font-extrabold text-white shadow-ledge-active'
                      : 'font-bold text-ink hover:bg-primary-soft hover:text-primary-deep'
                  }`}
                >
                  <NavIconChip icon={it.icon} on={on} tone={meta?.tone ?? 'blue'} />
                  {it.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div data-testid="sidebar-foot" className="flex flex-col gap-3 rounded-panel bg-primary-soft p-3.5">
        <div className="flex items-center gap-2.5">
          <AvatarImage avatar={teacher.avatar} size={44} />
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold">{teacher.displayName}</div>
            <div className="text-[13px] font-semibold text-muted">Giáo viên – Admin</div>
          </div>
        </div>
        <Link
          href="/em"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl border-2 border-primary-strong bg-white px-3 text-[14px] font-extrabold text-primary-strong transition-colors hover:bg-primary-soft hover:text-primary-deep"
        >
          <Icon d={ICONS.eye} size={18} />
          Xem như học sinh
        </Link>
      </div>
      {/* Trang trí: phi hành gia ngồi trên mặt trăng ở đáy menu (ảnh dùng chung với trang đăng nhập). */}
      <div data-testid="sidebar-mascot" aria-hidden="true" className="sidebar-mascot">
        {/* eslint-disable @next/next/no-img-element */}
        <img src="/brand/login/mat-trang.webp" alt="" loading="lazy" decoding="async" draggable={false} className="sidebar-mascot-moon" />
        <img src="/brand/login/robot.webp" alt="" loading="lazy" decoding="async" draggable={false} className="sidebar-mascot-robot" />
        <img src="/brand/login/sao-tho.webp" alt="" loading="lazy" decoding="async" draggable={false} className="sidebar-mascot-star" />
        {/* eslint-enable @next/next/no-img-element */}
      </div>
    </aside>
    </>
  )
}
