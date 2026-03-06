import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type ActionButtonProps = Omit<ButtonProps, "loading"> & {
  loading?: boolean;
  loadingText?: string;
  iconeEsquerda?: ReactNode;
  iconeDireita?: ReactNode;
};

export function ActionButton({
  children,
  disabled,
  loading = false,
  loadingText,
  iconeEsquerda,
  iconeDireita,
  ...props
}: ActionButtonProps) {
  return (
    <Button {...props} disabled={disabled || loading}>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText ?? children}</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          {iconeEsquerda ? <span className="shrink-0">{iconeEsquerda}</span> : null}
          <span>{children}</span>
          {iconeDireita ? <span className="shrink-0">{iconeDireita}</span> : null}
        </span>
      )}
    </Button>
  );
}

export type { ActionButtonProps };
