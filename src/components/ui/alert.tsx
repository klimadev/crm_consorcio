import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 flex gap-3 items-start",
  {
    variants: {
      variant: {
        default: "bg-slate-50 border-slate-200 text-slate-700",
        success: "bg-emerald-50 border-emerald-100 text-emerald-800",
        warning: "bg-amber-50 border-amber-100 text-amber-800",
        error: "bg-rose-50 border-rose-100 text-rose-800",
        info: "bg-blue-50 border-blue-100 text-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  dismissible?: boolean;
  onDismiss?: () => void;
}

function Alert({ className, variant, dismissible, onDismiss, children, ...props }: AlertProps) {
  return (
    <div className={cn(alertVariants({ variant }), className)} {...props}>
      <AlertIcon variant={variant} />
      <div className="flex-1">{children}</div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function AlertIcon({ variant }: { variant?: AlertProps["variant"] }) {
  switch (variant) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />;
    case "warning":
      return <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />;
    case "error":
      return <XCircle className="h-5 w-5 text-rose-500 shrink-0" />;
    case "info":
      return <Info className="h-5 w-5 text-blue-500 shrink-0" />;
    default:
      return <Info className="h-5 w-5 text-slate-500 shrink-0" />;
  }
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("font-semibold text-sm mb-0.5", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm opacity-90", className)} {...props} />;
}

export { Alert, alertVariants, AlertTitle, AlertDescription };
