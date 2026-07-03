import { cn } from '@/utils/cn';

function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-2xl bg-background', className)} />;
}

export default Skeleton;
