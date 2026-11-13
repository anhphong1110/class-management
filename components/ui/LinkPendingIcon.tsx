'use client'

import { useLinkStatus } from 'next/link'
import type { ReactNode } from 'react'
import { Icon, ICONS } from './Icon'

/**
 * Đặt BÊN TRONG một <Link> (yêu cầu của useLinkStatus). Trong lúc link đang chuyển trang thì thay `children`
 * (icon gốc) bằng vòng quay, hoặc thêm vòng quay nếu không có icon gốc. Hiện trễ 100ms (.lp-old/.lp-new trong globals.css)
 * để link đã được tải sẵn, mở gần như ngay, không bị nháy.
 */
export function LinkPendingIcon({ children, size = 18 }: { children?: ReactNode; size?: number }) {
  const { pending } = useLinkStatus()
  if (!pending) return <>{children}</>
  const spinner = <Icon d={ICONS.spinner} size={size} className="motion-safe:animate-spin" />
  return (
    <>
      {children ? (
        <span className="relative inline-flex">
          <span className="lp-old inline-flex">{children}</span>
          <span className="lp-new absolute inset-0 flex items-center justify-center">{spinner}</span>
        </span>
      ) : (
        <span className="lp-new inline-flex">{spinner}</span>
      )}
      <span className="sr-only">Đang tải…</span>
    </>
  )
}
