import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

const Input = forwardRef(function Input(
  { label, error, hint, className, leftIcon: LeftIcon, ...props },
  ref,
) {
  return (
    <label className="flex w-full flex-col gap-2">
      {label ? <span className="text-sm font-semibold text-heading">{label}</span> : null}
      <div
        className={cn(
          'flex h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 transition focus-within:ring-0',
          error && 'border-danger',
          className,
        )}
      >
        {LeftIcon ? <LeftIcon className="h-4 w-4 text-body" /> : null}
        <input
          ref={ref}
          className="w-full bg-transparent text-sm text-heading placeholder:text-body-muted focus:outline-none"
          {...props}
        />
      </div>
      {error ? <span className="text-xs font-medium text-danger">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-body">{hint}</span> : null}
    </label>
  );
});

export default Input;
