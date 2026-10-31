"use client";

import { useId } from "react";

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-l`}
      aria-describedby={hint ? `${id}-h` : undefined}
      disabled={disabled}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className="flex min-h-[50px] w-full items-center justify-between gap-4 rounded-2xl text-left disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
    >
      <span className="block">
        <span id={`${id}-l`} className="block font-extrabold text-ink">
          {label}
        </span>
        {hint ? (
          <span id={`${id}-h`} className="block text-sm font-semibold text-muted">
            {hint}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className="relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "#4F5BD5" : "#B9B5E8" }}
      >
        <span
          className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[left]"
          style={{ left: checked ? 22 : 3 }}
        />
      </span>
    </button>
  );
}
