import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "md" | "lg";

/** `--edge` là màu gờ đáy của kiểu "đất sét" (xem .clay-press trong globals.css). */
const styles: Record<Variant, string> = {
  primary:
    "clay-press bg-primary-strong text-white [--edge:var(--primary-deep)] hover:bg-primary-ink",
  secondary:
    "clay-press border-2 border-primary-strong bg-white text-primary-strong [--edge:var(--primary-edge)] hover:bg-primary-soft hover:text-primary-deep",
  ghost: "bg-transparent text-primary-strong hover:bg-primary-soft hover:text-primary-deep",
  danger:
    "clay-press bg-danger text-white [--edge:var(--color-danger-deep)] hover:bg-danger-deep",
  accent:
    "clay-press bg-star text-star-ink [--edge:var(--color-star-edge)] hover:bg-[#FFD65E]",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 text-base",
  lg: "min-h-[52px] px-6 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[16px] border-0 font-body font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
