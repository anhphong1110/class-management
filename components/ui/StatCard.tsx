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
  value,
  label,
  tone = "blue",
  href,
  note,
}: {
  icon: string;
  value: ReactNode;
  label: string;
  tone?: keyof typeof tones;
  href?: string;
  note?: ReactNode;
}) {
  const t = tones[tone];
  const body = (
    <>
      <Icon d={icon} size={30} className={t.icon} />
      <div data-testid="stat-value" className="font-display text-[34px] font-extrabold leading-none">
        {value}
      </div>
      <div className="text-[15px] font-extrabold text-muted">{label}</div>
      {note ? <div className="text-sm font-bold text-muted">{note}</div> : null}
    </>
  );
  const cls = `clay-card flex flex-col items-center gap-1 px-4 py-4 text-center text-ink ${t.card}`;
  return href ? (
    <Link href={href} className={`${cls} clay-press no-underline [--edge:var(--primary-edge)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
