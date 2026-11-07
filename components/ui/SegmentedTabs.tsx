"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";

export type TabItem<K extends string> = { key: K; label: ReactNode; icon?: string };

/**
 * Nhóm tab dạng nút "đất sét": role tablist/tab, mũi tên trái phải để đổi tab (roving tabindex).
 * `idPrefix` tạo id `tab-<prefix>-<key>`; `panelId` nối với tabpanel qua aria-controls.
 */
export function SegmentedTabs<K extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix = "tabs",
  panelId,
  className = "",
}: {
  items: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  idPrefix?: string;
  panelId?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex gap-2 rounded-[20px] bg-primary-soft p-1.5 pb-[9px] ${className}`}
    >
      {items.map((it, i) => {
        const on = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            id={`${idPrefix}-${it.key}`}
            aria-selected={on}
            aria-controls={panelId}
            tabIndex={on ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              const next = items[(i + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length];
              onChange(next.key);
              document.getElementById(`${idPrefix}-${next.key}`)?.focus();
            }}
            onClick={() => onChange(it.key)}
            className={`clay-press inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] border-2 text-[15px] font-extrabold ${
              on
                ? "border-primary-strong bg-primary-strong text-white [--edge:var(--primary-deep)]"
                : "border-edge bg-white text-ink [--edge:var(--primary-edge)] hover:border-primary-strong hover:bg-primary-soft hover:text-primary-deep"
            }`}
          >
            {it.icon ? <Icon d={it.icon} size={18} /> : null}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
