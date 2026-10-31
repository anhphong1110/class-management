import type { ReactNode } from "react";

const tones = {
  success: "bg-[#E6F8F4] text-[#17695C]",
  error: "bg-[#FDE8EE] text-[#B3203F]",
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
      className={`rounded-2xl px-4 py-3 text-sm font-bold ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
