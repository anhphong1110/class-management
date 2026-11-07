import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";

type ControlProps = { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean };

/**
 * Nhãn luôn hiện (không chỉ placeholder), gợi ý và lỗi nằm ngay dưới ô,
 * lỗi nối với ô bằng aria-describedby.
 */
export function Field({
  label,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-h` : "", error ? `${id}-e` : ""].filter(Boolean).join(" ");
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[15px] font-extrabold text-ink">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && !error ? (
        <p id={`${id}-h`} className="m-0 text-sm font-semibold text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-e`} className="m-0 flex items-center gap-1.5 text-sm font-bold text-danger-deep">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 8v5M12 16h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" />
          </svg>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`clay-field text-base ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`clay-field text-base ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`clay-field min-h-[104px] py-3 text-base ${className}`} {...props} />;
}
