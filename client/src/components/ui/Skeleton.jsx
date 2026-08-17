import { cn } from '@/utils/cn';

const variants = {
  default: 'rounded-xl',
  text: 'rounded-md',
  circle: 'rounded-full',
  card: 'rounded-2xl',
};

function Skeleton({
  className,
  variant = 'default',
  ...props
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-background-muted',
        variants[variant] || variants.default,
        className,
      )}
      {...props}
    />
  );
}

export default Skeleton;