import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-primary-strong text-white hover:opacity-90",
  secondary: "bg-white text-primary-strong border-2 border-primary-strong hover:bg-bg",
  ghost: "bg-transparent text-primary-strong hover:bg-bg",
  danger: "bg-[#C0314E] text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-5 font-body font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
