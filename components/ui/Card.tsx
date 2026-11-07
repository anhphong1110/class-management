import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`clay-card px-6 py-[22px] text-ink ${className}`} {...props} />;
}
