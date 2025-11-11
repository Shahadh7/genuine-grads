'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  id?: string;
}

type ToastInput = ToastOptions | string;

interface ToastMessage extends Required<Omit<ToastOptions, 'duration'>> {
  duration: number;
}

interface ToastContextValue {
  push: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  success: (input: ToastInput) => string;
  error: (input: ToastInput) => string;
  warning: (input: ToastInput) => string;
  info: (input: ToastInput) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 6000;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function getDefaultTitle(variant: ToastVariant): string {
  switch (variant) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    case 'warning':
      return 'Warning';
    default:
      return 'Notice';
  }
}

const baseToastClasses =
  'pointer-events-auto rounded-xl border shadow-lg shadow-black/10 px-4 py-3 backdrop-blur-md transition-all bg-white/90 text-zinc-900 dark:bg-zinc-900/80 dark:text-zinc-50';

const variantStyles: Record<ToastVariant, string> = {
  success:
    'border-emerald-500/40 bg-emerald-50/90 text-emerald-900 dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-100',
  error:
    'border-red-500/40 bg-red-50/90 text-red-900 dark:bg-red-500/25 dark:border-red-500/50 dark:text-red-100',
  warning:
    'border-amber-500/40 bg-amber-50/90 text-amber-900 dark:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-100',
  info:
    'border-sky-500/40 bg-sky-50/90 text-sky-900 dark:bg-sky-500/20 dark:border-sky-500/50 dark:text-sky-100',
};

export function ToastProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const scheduleAutoDismiss = useCallback(
    (id: string, duration: number) => {
      if (duration <= 0) return;
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const push = useCallback(
    (options: ToastOptions) => {
      const id = options.id ?? generateId();
      const variant = options.variant ?? 'info';
      const duration = options.duration ?? DEFAULT_DURATION;
      const message: ToastMessage = {
        id,
        variant,
        duration,
        title: options.title ?? getDefaultTitle(variant),
        description: options.description ?? '',
      };

      setToasts((prev) => [...prev.filter((toast) => toast.id !== id), message]);
      scheduleAutoDismiss(id, duration);

      return id;
    },
    [scheduleAutoDismiss]
  );

  const value = useMemo<ToastContextValue>(() => {
    const builder =
      (variant: ToastVariant) =>
      (input: ToastInput) =>
        push(
          typeof input === 'string'
            ? { description: input, variant }
            : { ...input, variant }
        );

    return {
      push,
      dismiss,
      success: builder('success'),
      error: builder('error'),
      warning: builder('warning'),
      info: builder('info'),
    };
  }, [dismiss, push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[9999] mx-auto flex max-w-3xl flex-col gap-3 sm:inset-x-auto sm:right-6 sm:max-w-sm">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${baseToastClasses} ${variantStyles[toast.variant]}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                {toast.title ? (
                  <p className="text-sm font-semibold leading-5">{toast.title}</p>
                ) : null}
                {toast.description ? (
                  <p className="mt-1 text-sm leading-5 text-[inherit] opacity-90">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-sm text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => dismiss(toast.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}

