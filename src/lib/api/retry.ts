function isErroTransitorioDeBanco(error: Error) {
  const mensagem = error.message.toLowerCase();

  return (
    mensagem.includes("timed out") ||
    mensagem.includes("database is locked") ||
    mensagem.includes("connector error") ||
    mensagem.includes("sqlite") ||
    mensagem.includes("p1008")
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    onRetry,
    shouldRetry = isErroTransitorioDeBanco,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        break;
      }

      onRetry?.(attempt, lastError);
      const jitterMs = Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt + jitterMs));
    }
  }

  throw lastError!;
}
