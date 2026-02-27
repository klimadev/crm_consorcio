"use client";

import { useEffect, Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  };
}

function DefaultErrorFallback({ error, reset }: { error?: Error; reset: () => void }) {
  useEffect(() => {
    if (error) {
      console.error("ErrorBoundary caught an error:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-rose-50 p-4">
        <svg
          className="h-8 w-8 text-rose-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Algo deu errado</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ocorreu um erro inesperado. Por favor, tente novamente.
        </p>
        {process.env.NODE_ENV === "development" && error && (
          <pre className="mt-4 max-w-md overflow-auto rounded-lg bg-slate-100 p-4 text-left text-xs text-slate-600">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recarregar Página
        </Button>
        <Button onClick={reset}>Tentar Novamente</Button>
      </div>
    </div>
  );
}

export { ErrorBoundary };
