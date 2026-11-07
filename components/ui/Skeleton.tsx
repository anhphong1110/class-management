/** Khung xương khi đang tải; tắt chuyển động khi người dùng yêu cầu giảm chuyển động. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="flex flex-col gap-5">
      <Skeleton className="h-[72px] w-full" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
