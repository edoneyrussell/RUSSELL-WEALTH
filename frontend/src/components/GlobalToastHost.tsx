import { useEffect, useState } from 'react';

type ToastType = 'success' | 'warning' | 'error' | 'info';

type ToastMessage = {
  id: number;
  message: string;
  type: ToastType;
};

declare global {
  interface WindowEventMap {
    'rw-toast': CustomEvent<{
      message: string;
      type?: ToastType;
      duration?: number;
    }>;
  }
}

export default function GlobalToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const timers = new Map<number, number>();

    const showToast = (event: WindowEventMap['rw-toast']) => {
      const id = Date.now() + Math.random();
      const toast = {
        id,
        message: event.detail.message,
        type: event.detail.type ?? 'info',
      };

      setToasts(current => [...current, toast]);

      const timer = window.setTimeout(() => {
        setToasts(current => current.filter(item => item.id !== id));
        timers.delete(id);
      }, event.detail.duration ?? 4000);

      timers.set(id, timer);
    };

    window.addEventListener('rw-toast', showToast);

    return () => {
      window.removeEventListener('rw-toast', showToast);
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  function dismiss(id: number) {
    setToasts(current => current.filter(item => item.id !== id));
  }

  return (
    <div
      className="rw-toast-container"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`rw-toast rw-toast-${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <span className="rw-toast-indicator" />
          <span className="rw-toast-message">{toast.message}</span>
          <button
            type="button"
            className="rw-toast-close"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
