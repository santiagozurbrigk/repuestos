"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  onClose: (id: string) => void;
}

export function Toast({ id, title, description, variant = "default", onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => onClose(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    default: <Info className="h-5 w-5 text-blue-500" />,
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 w-80 rounded-lg border bg-white p-4 shadow-lg",
        variant === "error" && "border-red-200",
        variant === "success" && "border-green-200",
        variant === "warning" && "border-amber-200",
        variant === "default" && "border-gray-200"
      )}
    >
      {icons[variant]}
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-medium text-gray-900">{title}</p>}
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onClose(id)} className="text-gray-400 hover:text-gray-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContextValue {
  toast: (props: Omit<ToastProps, "id" | "onClose">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const toast = React.useCallback((props: Omit<ToastProps, "id" | "onClose">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...props, id, onClose: removeToast }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-16 md:bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
