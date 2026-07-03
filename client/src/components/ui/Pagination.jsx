import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';

function Pagination({ page = 1, totalPages = 1, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        size="sm"
        variant="outline"
      >
        Previous
      </Button>
      {pages.map((item) => (
        <button
          key={item}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold transition',
            item === page
              ? 'border-primary bg-primary text-card'
              : 'border-border bg-card text-heading hover:bg-background',
          )}
          onClick={() => onPageChange(item)}
          type="button"
        >
          {item}
        </button>
      ))}
      <Button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        size="sm"
        variant="outline"
      >
        Next
      </Button>
    </div>
  );
}

export default Pagination;
