import Skeleton from '@/components/ui/Skeleton';

function LoadingPage() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 lg:grid-cols-4">
          <Skeleton className="h-40 lg:col-span-1" />
          <div className="space-y-6 lg:col-span-3">
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingPage;
