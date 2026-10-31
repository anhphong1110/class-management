import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card bg-white p-5 text-ink shadow-[0_6px_20px_rgba(102,117,232,0.10)] ${className}`}
      {...props}
    />
  );
}
