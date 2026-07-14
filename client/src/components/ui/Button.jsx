import { LoaderCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

const variants = {
  primary: 'bg-primary text-card hover:bg-primary-hover',
  secondary: 'bg-heading text-card hover:bg-sidebar',
  ghost: 'bg-transparent text-heading hover:bg-primary-tint',
  danger: 'bg-danger text-card hover:opacity-90',
  outline: 'border border-border bg-card text-heading hover:bg-background',
};

const sizes = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

function Button({
  as: Component = 'button',
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...props
}) {
  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      <span>{children}</span>
    </Component>
  );
}

export default Button;
