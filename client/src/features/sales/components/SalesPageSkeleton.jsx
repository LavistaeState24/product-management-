import Skeleton from '@/components/ui/Skeleton';

function SalesPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-10 w-64" />
        <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="panel p-6">
          <Skeleton className="h-5 w-36" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-3xl" />
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <Skeleton className="h-5 w-28" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesPageSkeleton;
