'use client'

import { createPortal } from 'react-dom'

/**
 * Màn chờ "tên lửa" phủ toàn màn hình trong lúc đăng nhập (từ lúc bấm đến khi trang mới hiện).
 * Portal ra <body> để không bị nút chat (z-40) hay lớp `.sp > *` che; hiện trễ 300ms (xem .sp-launch trong login.css)
 * để lần gõ sai mật khẩu không làm cả màn hình nháy lên.
 */
export function LaunchOverlay({ show }: { show: boolean }) {
  if (!show) return null
  return createPortal(
    <div data-testid="launch-overlay" role="status" aria-live="polite" className="sp-launch">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/login/ten-lua.webp" alt="" aria-hidden="true" draggable={false} className="sp-launch-rocket" />
      <p className="sp-launch-text">Đang chuẩn bị trạm…</p>
    </div>,
    document.body,
  )
}
