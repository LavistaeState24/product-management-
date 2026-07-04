import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, rows = 4, ...props },
  ref,
) {
  return (
    <label className="flex w-full flex-col gap-2">
      {label ? <span className="text-sm font-semibold text-heading">{label}</span> : null}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-heading transition placeholder:text-body-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint',
          error && 'border-danger',
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs font-medium text-danger">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-body">{hint}</span> : null}
    </label>
  );
});

export default Textarea;
