import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

function Modal({ open, title, description, onClose, children, className }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-4 py-6">
      <div className={cn('panel w-full max-w-xl p-6', className)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-heading">{title}</h3>
            {description ? <p className="mt-1 text-sm text-body">{description}</p> : null}
          </div>
          <button
            className="rounded-full p-2 text-body transition hover:bg-background hover:text-heading"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
