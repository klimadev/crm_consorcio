"use client";

import * as React from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastAcao = {
  label: string;
  run: () => void;
};

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: ToastAcao;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idPrefix = React.useId();
  let toastCounter = React.useRef(0);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    toastCounter.current += 1;
    const id = `toast-${idPrefix}-${toastCounter.current}`;
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, [idPrefix]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-destructive" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    info: <Info className="h-5 w-5 text-info" />,
  };

  const backgrounds = {
    success: "bg-success/10 border-success/25",
    error: "bg-destructive/10 border-destructive/25",
    warning: "bg-warning/10 border-warning/25",
    info: "bg-info/10 border-info/25",
  };

  const iconsBg = {
    success: "bg-success/15",
    error: "bg-destructive/15",
    warning: "bg-warning/15",
    info: "bg-info/15",
  };

  return (
    <div
      className={cn(
        "animate-slide-in-right rounded-lg border p-4 shadow-lg shadow-black/40 transition-all duration-300 bg-background-elevated",
        backgrounds[toast.type]
      )}
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <div className="flex gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", iconsBg[toast.type])}>
          {icons[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-sm text-foreground-muted">{toast.description}</p>
          )}
        </div>
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              toast.action?.run();
              onClose();
            }}
            className="shrink-0 self-start rounded-md px-2 py-1 text-sm font-semibold text-foreground underline underline-offset-2 transition-colors hover:bg-muted"
          >
            {toast.action.label}
          </button>
        ) : null}
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1 hover:bg-muted transition-colors"
          aria-label="Fechar notificação"
        >
          <X className="h-4 w-4 text-foreground-muted" />
        </button>
      </div>
    </div>
  );
}
