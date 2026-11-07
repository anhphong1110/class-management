import type { ReactNode } from "react";

const tones = {
  success: "bg-success-soft text-success-deep",
  error: "bg-danger-soft text-danger-deep",
  info: "bg-primary-soft text-primary-deep",
};

const icons = {
  success: "M9 12l2 2 4-4M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18",
  error: "M12 8v5M12 16h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18",
  info: "M12 11v5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18",
};

export function Notice({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-[16px] px-4 py-3 text-[15px] font-bold ${tones[tone]}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="mt-0.5 flex-none"
      >
        <path d={icons[tone]} />
      </svg>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
