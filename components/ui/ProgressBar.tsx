/** Thanh tiến độ có nhãn chữ (không chỉ màu), dùng role="progressbar". */
export function ProgressBar({
  value,
  max,
  label,
  tone = "primary",
}: {
  value: number;
  max: number;
  label: string;
  tone?: "primary" | "star" | "success";
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const fill = { primary: "bg-primary-strong", star: "bg-star", success: "bg-success" }[tone];
  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
        aria-label={label}
        className="h-4 w-full overflow-hidden rounded-full bg-primary-soft"
      >
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="m-0 mt-1.5 text-sm font-extrabold text-muted">{label}</p>
    </div>
  );
}
