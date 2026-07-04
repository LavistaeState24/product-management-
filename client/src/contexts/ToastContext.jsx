import { createContext, useCallback, useMemo, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export const ToastContext = createContext(null);

const toastStyles = {
  success: {
    icon: CheckCircle2,
    className: 'border-success/20 bg-card text-heading',
    iconClassName: 'text-success',
  },
  error: {
    icon: XCircle,
    className: 'border-danger/20 bg-card text-heading',
    iconClassName: 'text-danger',
  },
  warning: {
    icon: TriangleAlert,
    className: 'border-warning/20 bg-card text-heading',
    iconClassName: 'text-warning',
  },
  info: {
    icon: Info,
    className: 'border-info/20 bg-card text-heading',
    iconClassName: 'text-info',
  },
};

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const variant = toastStyles[toast.variant] || toastStyles.info;
        const Icon = variant.icon;

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto rounded-3xl border p-4 shadow-2xl backdrop-blur',
              variant.className,
            )}
            role="status"
          >
            <div className="flex items-start gap-3">
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', variant.iconClassName)} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-heading">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm text-body">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="rounded-full p-1 text-body transition hover:bg-background hover:text-heading"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, variant = 'info', duration = 3500 }) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      setToasts((current) => [...current, { id, title, description, variant }]);

      window.setTimeout(() => {
        dismiss(id);
      }, duration);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      showToast,
      success(title, description) {
        showToast({ title, description, variant: 'success' });
      },
      error(title, description) {
        showToast({ title, description, variant: 'error' });
      },
      warning(title, description) {
        showToast({ title, description, variant: 'warning' });
      },
      info(title, description) {
        showToast({ title, description, variant: 'info' });
      },
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
