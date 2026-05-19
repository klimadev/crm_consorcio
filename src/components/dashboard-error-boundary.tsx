"use client";

import { ErrorBoundary as ErrorBoundaryComponent } from "@/components/error-boundary";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
}

const ErrorFallback = ({ errorId, reset }: { errorId: string; reset: () => void }) => (
  <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
    <div className="rounded-full bg-destructive/10 p-4">
      <AlertCircle className="h-8 w-8 text-destructive" />
    </div>
    <div>
      <h2 className="text-lg font-semibold text-foreground">Algo deu errado</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        Ocorreu um erro ao carregar esta seção.
      </p>
      <p className="mt-2 text-xs text-foreground-disabled">
        Código: {errorId || "erro-na-secao"}. Diagnóstico salvo em crm:last-error-boundary.
      </p>
    </div>
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" onClick={() => window.location.reload()}>
        Recarregar Página
      </Button>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  </div>
);

export function DashboardErrorBoundary({ children }: DashboardErrorBoundaryProps) {
  return (
    <ErrorBoundaryComponent fallback={({ errorId, reset }) => <ErrorFallback errorId={errorId} reset={reset} />}>
      {children}
    </ErrorBoundaryComponent>
  );
}
