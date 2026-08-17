import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className,
}) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <h3
              id="modal-title"
              className="text-xl font-semibold tracking-tight text-heading"
            >
              {title}
            </h3>

            {description ? (
              <p className="mt-1.5 text-sm leading-6 text-body">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-body transition-colors hover:bg-background hover:text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-6 py-5',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;