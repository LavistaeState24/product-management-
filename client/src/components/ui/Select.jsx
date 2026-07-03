import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

const Select = forwardRef(function Select(
  { label, error, className, options = [], placeholder = 'Select', ...props },
  ref,
) {
  return (
    <label className="flex w-full flex-col gap-2">
      {label ? <span className="text-sm font-semibold text-heading">{label}</span> : null}
      <div
        className={cn(
          'flex h-12 items-center rounded-2xl border border-border bg-card px-4',
          error && 'border-danger',
          className,
        )}
      >
        <select
          ref={ref}
          className="w-full appearance-none bg-transparent text-sm text-heading focus:outline-none"
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="h-4 w-4 text-body" />
      </div>
      {error ? <span className="text-xs font-medium text-danger">{error}</span> : null}
    </label>
  );
});

export default Select;
