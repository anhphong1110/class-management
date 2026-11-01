'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Notice } from '@/components/ui/Notice'
import { FLASH_COOKIE } from '@/lib/flash/cookie'

/** Hiện một lần tin do Server Action để lại trong cookie, rồi xóa cookie. */
export function FlashNotice() {
  const pathname = usePathname()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const found = document.cookie.split('; ').find((c) => c.startsWith(`${FLASH_COOKIE}=`))
    let text: string | null = null
    if (found) {
      try {
        text = decodeURIComponent(found.slice(FLASH_COOKIE.length + 1))
      } catch {
        text = null
      }
      document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/`
    }
    setMessage(text)
  }, [pathname])

  return message ? <Notice tone="success">{message}</Notice> : null
}
