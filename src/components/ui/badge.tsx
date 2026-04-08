import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground-muted border border-border",
        success: "bg-success/10 text-success border border-success/25",
        warning: "bg-warning/10 text-warning border border-warning/25",
        error: "bg-destructive/10 text-destructive border border-destructive/25",
        info: "bg-info/10 text-info border border-info/25",
        secondary: "bg-secondary text-secondary-foreground border border-border",
      },
      size: {
        default: "px-3 py-1.5 text-xs",
        sm: "px-2 py-1 text-[10px]",
        lg: "px-4 py-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-success",
            variant === "warning" && "bg-warning",
            variant === "error" && "bg-destructive",
            variant === "info" && "bg-info",
            (variant === "default" || variant === "secondary" || !variant) && "bg-foreground-disabled",
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
