import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div role="status" aria-label="Đang tải" className="clay-card flex flex-col gap-4 px-6 py-[22px]">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-[52dvh] min-h-[320px] w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
