import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { cn } from "../../lib/cn";

type ToastVariant = "default" | "success" | "error";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastRecord extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  pushToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({
  pushToast: () => {},
});

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (options: ToastOptions) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const toast: ToastRecord = {
        id,
        durationMs: options.durationMs ?? 3200,
        ...options,
      };
      setToasts((prev) => [...prev, toast]);
      const timeoutId = window.setTimeout(
        () => removeToast(id),
        toast.durationMs,
      );
      timeoutsRef.current.set(id, timeoutId);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto min-w-[240px] rounded-2xl border px-4 py-3 shadow-glow backdrop-blur-md",
              toast.variant === "success"
                ? "border-emerald-400/40 bg-emerald-500/10"
                : toast.variant === "error"
                ? "border-rose-400/40 bg-rose-500/10"
                : "border-white/10 bg-black/60",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-1 text-xs text-white/70">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                className="text-xs text-white/60 hover:text-white"
                onClick={() => removeToast(toast.id)}
              >
                关闭
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
