import type { ReactNode } from "react";
import { Icon, ICONS } from "./Icon";

/** Trạng thái trống: lời mời + một hành động, không xin lỗi. */
export function EmptyState({
  title,
  children,
  icon = ICONS.inbox,
  action,
}: {
  title: string;
  children?: ReactNode;
  icon?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-edge bg-white/70 px-6 py-9 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
        <Icon d={icon} size={28} />
      </div>
      <h3 className="m-0 font-display text-xl font-extrabold text-ink">{title}</h3>
      {children ? <p className="m-0 max-w-[420px] text-[15px] font-semibold text-muted">{children}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
