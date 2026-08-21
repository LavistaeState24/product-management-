import { cn } from '@/utils/cn';

const badgeVariants = {
  info: 'border-info/20 bg-info-tint text-info',
  success: 'border-success/20 bg-success-tint text-success',
  warning: 'border-warning/20 bg-warning-tint text-warning',
  danger: 'border-danger/20 bg-danger-tint text-danger',
  neutral: 'border-primary/20 bg-primary-tint text-primary',
};

const badgeSizes = {
  sm: 'px-2 py-1 text-[10px]',
  md: 'px-3 py-1.5 text-xs',
  lg: 'px-3.5 py-2 text-sm',
};

function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center justify-center whitespace-nowrap rounded-full border font-semibold leading-none transition-colors',
        badgeVariants[variant] || badgeVariants.neutral,
        badgeSizes[size] || badgeSizes.md,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;