import { Button } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'

export function DeleteDemoModal({
  open,
  onClose,
  demoCount,
  step,
  setStep,
  sure,
  setSure,
  pending,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  demoCount: number
  step: 1 | 2
  setStep: (s: 1 | 2) => void
  sure: boolean
  setSure: (v: boolean) => void
  pending: boolean
  onDelete: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Xóa toàn bộ dữ liệu mẫu (${demoCount} học sinh mẫu và dữ liệu đi kèm)? Không hoàn tác được.`}
    >
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <p className="m-0 flex items-start gap-3 text-base font-semibold text-muted">
            <Icon d={ICONS.alert} size={22} className="mt-0.5 text-danger" />
            <span>Học sinh mẫu, sao, điểm danh và các dữ liệu đi kèm sẽ bị xóa. Học sinh thật cô đã nhập không bị ảnh hưởng.</span>
          </p>
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Hủy
            </Button>
            <Button variant="danger" onClick={() => setStep(2)} disabled={pending}>
              Tiếp tục
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex min-h-11 items-start gap-2.5 text-[15px] font-bold">
            <input
              type="checkbox"
              className="mt-0.5 size-5 accent-danger"
              checked={sure}
              disabled={pending}
              onChange={(e) => setSure(e.target.checked)}
            />
            Cô hiểu việc này không hoàn tác được.
          </label>
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setStep(1)} disabled={pending}>
              Quay lại
            </Button>
            <Button variant="danger" onClick={onDelete} loading={pending} disabled={!sure}>
              Xóa dữ liệu demo
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
