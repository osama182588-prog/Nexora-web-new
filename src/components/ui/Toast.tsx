"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Duration in ms before auto-dismiss. Defaults to 4500. Use 0 to keep it until dismissed. */
  duration?: number;
  /** Optional action shown on the right of the toast. */
  action?: { label: string; onClick: () => void };
}

interface ToastEntry extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_META: Record<
  ToastVariant,
  { icon: IconName; iconClass: string; ring: string; bar: string }
> = {
  success: {
    icon: "Check2",
    iconClass: "text-emerald-300 bg-emerald-400/10 ring-emerald-400/30",
    ring: "ring-emerald-400/20",
    bar: "from-emerald-400 to-teal-300"
  },
  error: {
    icon: "Warning",
    iconClass: "text-rose-300 bg-rose-500/10 ring-rose-400/30",
    ring: "ring-rose-500/20",
    bar: "from-rose-400 to-red-500"
  },
  info: {
    icon: "Info",
    iconClass: "text-neon-cyan bg-neon-cyan/10 ring-neon-cyan/30",
    ring: "ring-neon-cyan/20",
    bar: "from-neon-cyan to-neon-blue"
  },
  warning: {
    icon: "Bell",
    iconClass: "text-amber-300 bg-amber-400/10 ring-amber-400/30",
    ring: "ring-amber-400/20",
    bar: "from-amber-300 to-orange-400"
  }
};

/**
 * Lightweight toast provider.
 *
 * Designed to be the single source of feedback for async operations
 * (save, publish, delete, ...). Stack of up to 5 toasts is rendered in
 * the bottom-right with a subtle slide-in and progress bar.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const entry: ToastEntry = {
        id,
        variant: "info",
        duration: 4500,
        ...opts
      };
      setToasts((cur) => [...cur.slice(-4), entry]);
      if (entry.duration && entry.duration > 0) {
        const handle = setTimeout(() => dismiss(id), entry.duration);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss]
  );

  // Clean up any pending timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const handle of map.values()) clearTimeout(handle);
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} entry={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  entry,
  onDismiss
}: {
  entry: ToastEntry;
  onDismiss: () => void;
}) {
  const meta = VARIANT_META[entry.variant ?? "info"];
  const Ico = Icon[meta.icon];
  const showBar = !!entry.duration && entry.duration > 0;

  return (
    <div
      role={entry.variant === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto relative overflow-hidden rounded-xl glass-strong p-3 shadow-glow ring-1 animate-toast-in",
        meta.ring
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ring-1",
            meta.iconClass
          )}
        >
          <Ico size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{entry.title}</p>
          {entry.description && (
            <p className="mt-0.5 text-xs text-slate-400">{entry.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {entry.action && (
            <button
              type="button"
              onClick={() => {
                entry.action?.onClick();
                onDismiss();
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-neon-purple transition hover:bg-white/5 hover:text-white"
            >
              {entry.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-white/5 hover:text-white"
          >
            <Icon.X size={12} />
          </button>
        </div>
      </div>
      {showBar && (
        <span
          className={cn(
            "absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gradient-to-r animate-toast-progress",
            meta.bar
          )}
          style={{
            animationDuration: `${entry.duration}ms`
          }}
        />
      )}
    </div>
  );
}

/**
 * Hook for triggering toasts from any client component.
 *
 * The provider is mounted at the root, so this is always safe.
 * If somehow used outside the provider it falls back to a no-op
 * (rather than crashing) and logs a warning.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[nexora] useToast used outside ToastProvider");
    }
    return { toast: () => "", dismiss: () => undefined };
  }
  return ctx;
}
