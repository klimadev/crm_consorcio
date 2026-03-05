import { serverError } from "@/lib/api/http";

export function handleRouteError(error: unknown, fallbackMessage: string, logPrefix?: string) {
  if (logPrefix) {
    console.error(logPrefix, error);
  }
  return serverError(fallbackMessage);
}
