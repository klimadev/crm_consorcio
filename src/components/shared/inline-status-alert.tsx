import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type InlineStatusAlertProps = {
  variant: "error" | "success" | "warning" | "info";
  message?: string | null;
  icon?: ReactNode;
  className?: string;
};

const variantStyles = {
  error: "border-rose-200/60 bg-rose-50/50 text-rose-700",
  success: "border-emerald-200/60 bg-emerald-50/50 text-emerald-700",
  warning: "border-amber-200/60 bg-amber-50/50 text-amber-700",
  info: "border-blue-200/60 bg-blue-50/50 text-blue-700",
};

const iconStyles = {
  error: "bg-rose-100 text-rose-600",
  success: "bg-emerald-100 text-emerald-600",
  warning: "bg-amber-100 text-amber-600",
  info: "bg-blue-100 text-blue-600",
};

function variantIcon(variant: InlineStatusAlertProps["variant"]) {
  switch (variant) {
    case "error":
      return <AlertCircle className="h-4 w-4" />;
    case "success":
      return <CheckCircle2 className="h-4 w-4" />;
    case "warning":
      return <TriangleAlert className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

export function InlineStatusAlert({ variant, message, icon, className }: InlineStatusAlertProps) {
  if (!message) return null;

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm", variantStyles[variant], className)}>
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconStyles[variant])}>
        {icon ?? variantIcon(variant)}
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
