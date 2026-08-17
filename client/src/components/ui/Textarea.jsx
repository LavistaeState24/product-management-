import { forwardRef, useId } from 'react';
import { cn } from '@/utils/cn';

const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    hint,
    className,
    rows = 1,
    placeholder = 'Enter details',
    id,
    disabled = false,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <label
      htmlFor={textareaId}
      className="flex w-full flex-col gap-2"
    >
      {label ? (
        <span className="text-sm font-semibold text-heading">
          {label}
        </span>
      ) : null}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={cn(
          'min-h-[96px] w-full resize-y rounded-xl border bg-card px-4 py-3',
          'text-sm leading-6 text-heading placeholder:text-body-muted',
          'transition-all duration-200 outline-none',
          'focus:border-primary focus:ring-4 focus:ring-primary/10',
          'disabled:cursor-not-allowed disabled:bg-background disabled:opacity-60',
          error
            ? 'border-danger focus:border-danger focus:ring-danger/10'
            : 'border-border',
          className,
        )}
        {...props}
      />

      {error ? (
        <span className="text-xs font-medium text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-body-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
});

export default Textarea;