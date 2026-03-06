import { useCallback, useEffect, useRef, useState } from "react";

type UseAutoSaveParams<T> = {
  onSave: (valor: T) => Promise<void> | void;
  delayMs?: number;
  enabled?: boolean;
};

type UseAutoSaveReturn<T> = {
  autoSavePendente: boolean;
  agendarAutoSave: (valor: T) => void;
  cancelarAutoSave: () => void;
  executarAutoSaveAgora: (valor?: T) => Promise<void>;
};

export function useAutoSave<T>({ onSave, delayMs = 1000, enabled = true }: UseAutoSaveParams<T>): UseAutoSaveReturn<T> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valorPendenteRef = useRef<T | null>(null);
  const onSaveRef = useRef(onSave);
  const [autoSavePendente, setAutoSavePendente] = useState(false);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const cancelarAutoSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    valorPendenteRef.current = null;
    setAutoSavePendente(false);
  }, []);

  const executarAutoSaveAgora = useCallback(
    async (valor?: T) => {
      const valorParaSalvar = valor ?? valorPendenteRef.current;

      if (!enabled || valorParaSalvar == null) {
        cancelarAutoSave();
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      valorPendenteRef.current = null;
      setAutoSavePendente(false);

      await onSaveRef.current(valorParaSalvar);
    },
    [cancelarAutoSave, enabled],
  );

  const agendarAutoSave = useCallback(
    (valor: T) => {
      if (!enabled) return;

      valorPendenteRef.current = valor;
      setAutoSavePendente(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        void executarAutoSaveAgora();
      }, delayMs);
    },
    [delayMs, enabled, executarAutoSaveAgora],
  );

  useEffect(() => cancelarAutoSave, [cancelarAutoSave]);

  return {
    autoSavePendente,
    agendarAutoSave,
    cancelarAutoSave,
    executarAutoSaveAgora,
  };
}
