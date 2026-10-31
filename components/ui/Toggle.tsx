"use client";

import { useId } from "react";

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div>
        <div id={`${id}-l`} className="font-extrabold text-ink">
          {label}
        </div>
        {hint ? (
          <div id={`${id}-h`} className="text-sm font-semibold text-muted">
            {hint}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={hint ? `${id}-h` : undefined}
        onClick={() => onChange(!checked)}
        className="relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        style={{ background: checked ? "#4F5BD5" : "#B9B5E8" }}
      >
        <span
          className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[left]"
          style={{ left: checked ? 22 : 3 }}
        />
      </button>
    </div>
  );
}
