'use client'

import { useLayoutEffect } from 'react'

/**
 * Modal render qua portal vào document.body, nằm ngoài khung layout đã đặt --primary-*.
 * Chép các biến màu lên <body> để modal cũng theo màu chủ đạo (không cần truy vấn thêm).
 */
export function ThemeBodyVars({ vars }: { vars: Record<string, string> }) {
  const key = JSON.stringify(vars)
  useLayoutEffect(() => {
    const entries = Object.entries(JSON.parse(key) as Record<string, string>)
    for (const [k, v] of entries) document.body.style.setProperty(k, v)
    return () => {
      for (const [k] of entries) document.body.style.removeProperty(k)
    }
  }, [key])
  return null
}
