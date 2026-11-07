import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

const tones = {
  star: { card: "bg-[#FFF8DC] [--primary-edge:#FFE08A]", icon: "text-[#B07A00]" },
  pink: { card: "bg-[#FFEAF3] [--primary-edge:#FFC4DD]", icon: "text-[#C2185B]" },
  mint: { card: "bg-[#E3FAF4] [--primary-edge:#B2EEDD]", icon: "text-success" },
  blue: { card: "bg-[#EAF3FF] [--primary-edge:#CFE3FF]", icon: "text-primary-ink" },
} as const;

/** Thẻ số liệu to: icon, con số lớn, nhãn. Có `href` thì cả thẻ bấm được. */
export function StatCard({
  icon,
  art,
  value,
  label,
  tone = "blue",
  href,
  note,
}: {
  icon: string;
  /** Ảnh 3D thay icon nét (đường dẫn trong public/). Có ảnh thì thẻ xếp ngang: ảnh bên trái, chữ bên phải. */
  art?: string;
  value: ReactNode;
  label: string;
  tone?: keyof typeof tones;
  href?: string;
  note?: ReactNode;
}) {
  const t = tones[tone];
  const text = (
    <>
      <div data-testid="stat-value" className={`font-display text-[34px] font-extrabold leading-none ${art ? "order-2" : ""}`}>
        {value}
      </div>
      <div className={`text-[15px] font-extrabold text-muted ${art ? "order-1 leading-tight" : ""}`}>{label}</div>
      {note ? <div className={`text-sm font-bold text-muted ${art ? "order-3 leading-tight" : ""}`}>{note}</div> : null}
    </>
  );
  const body = art ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art} alt="" aria-hidden="true" width={72} height={72} loading="lazy" decoding="async" className="size-[72px] flex-none object-contain drop-shadow-[0_6px_6px_rgba(36,36,107,0.18)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">{text}</div>
    </>
  ) : (
    <>
      <Icon d={icon} size={30} className={t.icon} />
      {text}
    </>
  );
  const cls = `clay-card flex items-center text-ink ${art ? "flex-row gap-3 px-3.5 py-3.5" : "flex-col gap-1 px-4 py-4 text-center"} ${t.card}`;
  return href ? (
    <Link href={href} className={`${cls} clay-press no-underline [--edge:var(--primary-edge)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
