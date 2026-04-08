import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const optimisticSyncVariants = cva("rounded-md border border-dashed p-2 opacity-75", {
  variants: {
    variant: {
      warning: "border-warning/30 bg-warning/10",
      info: "border-info/30 bg-info/10",
      success: "border-success/30 bg-success/10",
    },
  },
  defaultVariants: {
    variant: "warning",
  },
});

const optimisticSyncLabelVariants = cva("mt-1 text-xs font-medium", {
  variants: {
    variant: {
      warning: "text-warning",
      info: "text-info",
      success: "text-success",
    },
  },
  defaultVariants: {
    variant: "warning",
  },
});

type OptimisticSyncProps = {
  active: boolean;
  children: ReactNode;
  className?: string;
  label?: string;
} & VariantProps<typeof optimisticSyncVariants>;

export function OptimisticSync({
  active,
  children,
  className,
  label = "Sincronizando...",
  variant,
}: OptimisticSyncProps) {
  if (!active) {
    return <>{children}</>;
  }

  return (
    <div className={cn(optimisticSyncVariants({ variant }), className)}>
      {children}
      <p className={optimisticSyncLabelVariants({ variant })}>{label}</p>
    </div>
  );
}
