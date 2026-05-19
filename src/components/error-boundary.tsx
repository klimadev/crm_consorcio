"use client";

import { useEffect, Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ErrorFallbackRender = (props: {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId: string;
  reset: () => void;
}) => ReactNode;

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode | ErrorFallbackRender;
};

type ErrorBoundaryState = {
  error?: Error;
  errorId: string;
  errorInfo?: React.ErrorInfo;
  hasError: boolean;
};

class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { errorId: "", hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { error, errorId: `erro-${Date.now().toString(36)}`, hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    const diagnostico = {
      componentStack: errorInfo.componentStack,
      message: error.message,
      name: error.name,
      path: typeof window !== "undefined" ? window.location.href : "server",
      stack: error.stack,
      timestamp: new Date().toISOString(),
      id: this.state.errorId,
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem("crm:last-error-boundary", JSON.stringify(diagnostico));
    }

    console.error("ErrorBoundary caught an error:", diagnostico, errorInfo);
  }

  reset = () => {
    this.setState({ error: undefined, errorId: "", errorInfo: undefined, hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error,
          errorId: this.state.errorId,
          errorInfo: this.state.errorInfo,
          reset: this.reset,
        });
      }

      return this.props.fallback || (
        <DefaultErrorFallback error={this.state.error} errorId={this.state.errorId} reset={this.reset} />
      );
    }

    return this.props.children;
  };
}

function DefaultErrorFallback({ error, errorId, reset }: { error?: Error; errorId: string; reset: () => void }) {
  useEffect(() => {
    if (error) {
      console.error("ErrorBoundary caught an error:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <svg
          className="h-8 w-8 text-destructive"
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
        <h2 className="text-lg font-semibold text-foreground">Algo deu errado</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Ocorreu um erro inesperado. Por favor, tente novamente.
        </p>
        {errorId ? <p className="mt-2 text-xs text-foreground-disabled">Código: {errorId}</p> : null}
        {process.env.NODE_ENV === "development" && error && (
          <pre className="mt-4 max-w-md overflow-auto rounded-lg bg-muted p-4 text-left text-xs text-foreground-muted">
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
