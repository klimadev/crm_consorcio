"use client";

import { ErrorBoundary as ErrorBoundaryComponent } from "@/components/error-boundary";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
}

const ErrorFallback = () => (
  <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
    <div className="rounded-full bg-rose-50 p-4">
      <AlertCircle className="h-8 w-8 text-rose-500" />
    </div>
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Algo deu errado</h2>
      <p className="mt-1 text-sm text-slate-500">
        Ocorreu um erro ao carregar esta seção.
      </p>
    </div>
    <Button variant="outline" onClick={() => window.location.reload()}>
      Recarregar Página
    </Button>
  </div>
);

export function DashboardErrorBoundary({ children }: DashboardErrorBoundaryProps) {
  return (
    <ErrorBoundaryComponent fallback={<ErrorFallback />}>
      {children}
    </ErrorBoundaryComponent>
  );
}
