import { LoaderCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

const buttonVariants = {
  primary:
    'bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-500/30',
  success:
    'bg-[#91c328] text-white shadow-sm hover:bg-[#7eaa22] focus-visible:ring-[#91c328]/30',
  warning:
    'bg-yellow-500 text-white shadow-sm hover:bg-yellow-600 focus-visible:ring-yellow-500/30',
  danger:
    'bg-red-500 text-white shadow-sm hover:bg-red-600 focus-visible:ring-red-500/30',
  secondary:
    'bg-heading text-card hover:bg-sidebar focus-visible:ring-heading/20',
  ghost:
    'bg-transparent text-heading hover:bg-primary-tint focus-visible:ring-primary/20',
  outline:
    'border border-border bg-card text-heading hover:bg-background focus-visible:ring-primary/20',
};

const buttonSizes = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'h-10 w-10 p-0',
};

function Button({
  as: Component = 'button',
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  ...props
}) {
  const isButton = Component === 'button';

  return (
    <Component
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-4',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariants[variant] || buttonVariants.primary,
        buttonSizes[size] || buttonSizes.md,
        className,
      )}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={disabled || loading ? true : undefined}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        children
      )}
    </Component>
  );
}

export default Button;