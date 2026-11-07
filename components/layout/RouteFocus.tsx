'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/** Sau khi đổi trang, đưa focus vào vùng nội dung chính để người dùng bàn phím/đọc màn hình không phải tab lại từ đầu. */
export function RouteFocus() {
  const pathname = usePathname()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])
  return null
}

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-ctl bg-primary-strong px-4 py-3 font-extrabold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
    >
      Bỏ qua tới nội dung chính
    </a>
  )
}
