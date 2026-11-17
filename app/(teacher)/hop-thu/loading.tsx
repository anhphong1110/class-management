import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div role="status" aria-label="Đang tải" className="flex flex-col gap-5">
      <Skeleton className="h-[72px] w-full" />
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-[60dvh] w-full max-lg:hidden" />
      </div>
    </div>
  )
}
