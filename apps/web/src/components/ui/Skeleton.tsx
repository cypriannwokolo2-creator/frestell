interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[var(--bg-tertiary)] radius-brutal ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card-bw p-6 space-y-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-10 w-28 mt-4" />
    </div>
  );
}
