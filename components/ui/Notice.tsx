import type { ReactNode } from "react";

const tones = {
  success: "bg-[#DDF6F1] text-[#0B5A4D]",
  error: "bg-[#FFE3EA] text-[#8E1B3B]",
};

export function Notice({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[14px] px-4 py-3 text-sm font-bold ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
