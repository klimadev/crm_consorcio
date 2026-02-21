import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const optimisticSyncVariants = cva("rounded-md border border-dashed p-2 opacity-75", {
  variants: {
    variant: {
      warning: "border-slate-300 bg-slate-50/70",
      info: "border-sky-300 bg-sky-50/70",
      success: "border-emerald-300 bg-emerald-50/70",
    },
  },
  defaultVariants: {
    variant: "warning",
  },
});

const optimisticSyncLabelVariants = cva("mt-1 text-xs font-medium", {
  variants: {
    variant: {
      warning: "text-amber-700",
      info: "text-sky-700",
      success: "text-emerald-700",
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
