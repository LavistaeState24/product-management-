import { LoaderCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

const variants = {
  // View
  primary: 'bg-blue-600 text-white hover:bg-blue-900',  // Edit
  success: 'bg-[#91c328] text-white hover:bg-[#91c328]',
   // Optional (if used elsewhere)
  warning: 'bg-yellow-500 text-white hover:bg-yellow-600',

  // Delete
  danger: 'bg-red-500 text-white hover:bg-red-600',

  secondary: 'bg-heading text-card hover:bg-sidebar',
  ghost: 'bg-transparent text-heading hover:bg-primary-tint',
  outline: 'border border-border bg-card text-heading hover:bg-background',
};

const sizes = {
  sm: 'h-10 w-10 p-0 text-sm',
  md: 'py-3 px-4 p-0 text-sm',
  lg: 'h-12 w-12 p-0 text-base',
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
        'inline-flex items-center justify-center rounded-xl font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        children
      )}
    </Component>
  );
}

export default Button;