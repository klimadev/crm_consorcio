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
  error: "border-destructive/25 bg-destructive/10 text-foreground",
  success: "border-success/25 bg-success/10 text-foreground",
  warning: "border-warning/25 bg-warning/10 text-foreground",
  info: "border-info/25 bg-info/10 text-foreground",
};

const iconStyles = {
  error: "bg-destructive/15 text-destructive",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
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
      <p className="text-sm font-medium text-foreground">{message}</p>
    </div>
  );
}
