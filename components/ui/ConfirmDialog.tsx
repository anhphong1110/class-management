"use client";

import { Button } from "./Button";
import { Icon, ICONS } from "./Icon";
import { Modal } from "./Modal";

/**
 * Hộp xác nhận cho thao tác khó hoàn tác. Nút hủy luôn đứng trước và là nút mặc định
 * được focus; nút nguy hiểm có icon và màu danger, tách khỏi nút an toàn.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Để sau",
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="m-0 mb-5 flex items-start gap-3 text-base font-semibold text-muted">
        {danger ? <Icon d={ICONS.alert} size={22} className="mt-0.5 text-danger" /> : null}
        <span>{message}</span>
      </p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={pending}>
          {pending ? "Đang xử lý…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
