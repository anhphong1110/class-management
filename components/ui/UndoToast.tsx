"use client";

import { useEffect, useRef } from "react";
import { Icon, ICONS } from "./Icon";

/**
 * Thông báo ngắn có nút Hoàn tác. Tự đóng sau `seconds` giây, không cướp focus
 * (aria-live="polite"). Đổi `id` để bắt đầu đếm lại cho một thao tác mới.
 */
export function UndoToast({
  id,
  message,
  onUndo,
  onDismiss,
  seconds = 5,
}: {
  id: string | number;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  seconds?: number;
}) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });
  useEffect(() => {
    const t = setTimeout(() => dismissRef.current(), seconds * 1000);
    return () => clearTimeout(t);
  }, [id, seconds]);
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="undo-toast"
      className="fixed bottom-24 left-1/2 z-40 flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 items-center gap-3 rounded-[18px] bg-ink px-4 py-3 text-white shadow-[0_10px_30px_rgba(35,31,77,0.35)] lg:bottom-6"
    >
      <span className="min-w-0 flex-1 text-[15px] font-bold">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-[12px] bg-white/15 px-3.5 font-extrabold text-[#FFE08A] hover:bg-white/25"
      >
        <Icon d={ICONS.undo} size={18} />
        Hoàn tác
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Đóng thông báo"
        className="inline-flex size-11 items-center justify-center rounded-[12px] text-white hover:bg-white/15"
      >
        <Icon d={ICONS.x} size={18} />
      </button>
    </div>
  );
}
