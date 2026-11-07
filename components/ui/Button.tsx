import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { Icon, ICONS } from "./Icon";

export type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
export type Size = "md" | "lg";

/** `--edge` là màu gờ đáy của kiểu "đất sét" (xem .clay-press trong globals.css). */
export const buttonStyles: Record<Variant, string> = {
  primary:
    "clay-press bg-primary-strong text-white [--edge:var(--primary-deep)] hover:bg-primary-ink",
  secondary:
    "clay-press border-2 border-primary-strong bg-white text-primary-strong [--edge:var(--primary-edge)] hover:bg-primary-soft hover:text-primary-deep",
  ghost: "bg-transparent text-primary-strong hover:bg-primary-soft hover:text-primary-deep",
  danger:
    "clay-press bg-danger text-white [--edge:var(--color-danger-deep)] hover:bg-danger-deep",
  accent:
    "clay-press bg-star text-star-ink [--edge:var(--color-star-edge)] hover:bg-star-hover",
};

export const buttonSizes: Record<Size, string> = {
  md: "min-h-11 px-5 text-base",
  lg: "min-h-[52px] px-6 text-lg",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-ctl border-0 font-body font-extrabold no-underline transition disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  type = "button",
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Đang xử lý: hiện vòng quay, khóa nút và báo `aria-busy`. */
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${buttonSizes[size]} ${buttonStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? <Icon d={ICONS.spinner} size={18} className="motion-safe:animate-spin" /> : null}
      {children}
    </button>
  );
}

/** Liên kết trông như nút (cùng `variant`/`size` với Button). */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link
      className={`${base} ${buttonSizes[size]} ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

/** Nút chỉ có icon: bắt buộc `label` (thành `aria-label` và tooltip), vùng bấm tối thiểu 44px. */
export function IconButton({
  label,
  icon,
  className = "",
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  label: string;
  icon: string;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`flex size-11 items-center justify-center rounded-ctl bg-primary-soft text-primary-ink transition-colors hover:bg-primary-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      <Icon d={icon} />
    </button>
  );
}
