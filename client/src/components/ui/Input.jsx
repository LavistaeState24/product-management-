import { forwardRef, useId } from 'react';
import { cn } from '@/utils/cn';

const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    className,
    inputClassName,
    leftIcon: LeftIcon,
    placeholder = 'Enter value',
    id,
    disabled = false,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <label
      htmlFor={inputId}
      className="flex w-full flex-col gap-2"
    >
      {label ? (
        <span className="text-sm font-semibold text-heading">
          {label}
        </span>
      ) : null}

      <div
        className={cn(
          'flex h-12 items-center gap-3 rounded-xl border bg-card px-4',
          'transition-all duration-200',
          'focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10',
          error
            ? 'border-danger focus-within:border-danger focus-within:ring-danger/10'
            : 'border-border',
          disabled && 'cursor-not-allowed bg-background opacity-60',
          className,
        )}
      >
        {LeftIcon ? (
          <LeftIcon
            className="h-4 w-4 shrink-0 text-body-muted"
            aria-hidden="true"
          />
        ) : null}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-full w-full bg-transparent text-sm text-heading',
            'placeholder:text-body-muted',
            'outline-none',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed',
            inputClassName,
          )}
          {...props}
        />
      </div>

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

export default Input;