import type { ReactNode } from "react";

const tones = {
  neutral: "bg-primary-soft text-primary-deep",
  star: "bg-star-soft text-star-ink",
  success: "bg-success-soft text-success-deep",
  danger: "bg-danger-soft text-danger-deep",
  pink: "bg-[#FFE1EE] text-[#9B1D54]",
} as const;

/** Nhãn trạng thái: luôn kèm chữ (có thể thêm icon), không dựa vào màu một mình. */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-extrabold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
