import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    className,
    selectClassName,
    options = [],
    placeholder = 'Select an option',
    id,
    disabled = false,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <label
      htmlFor={selectId}
      className="flex w-full flex-col gap-2"
    >
      {label ? (
        <span className="text-sm font-semibold text-heading">
          {label}
        </span>
      ) : null}

      <div
        className={cn(
          'relative flex h-12 items-center rounded-xl border bg-card',
          'transition-all duration-200',
          'focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10',
          error
            ? 'border-danger focus-within:border-danger focus-within:ring-danger/10'
            : 'border-border',
          disabled && 'cursor-not-allowed bg-background opacity-60',
          className,
        )}
      >
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-full w-full appearance-none rounded-xl bg-transparent px-4 pr-11',
            'text-sm text-heading outline-none',
            'cursor-pointer disabled:cursor-not-allowed',
            selectClassName,
          )}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-4 h-4 w-4 text-body-muted"
          aria-hidden="true"
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

export default Select;