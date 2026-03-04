"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { UseConfigsReturn } from "../types";

export function useConfigsModule(): UseConfigsReturn {
  const [erro, setErro] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const INATIVA_POLLING_MS = 15000;

  const bootstrap = useCallback(async () => {
    const resEstagios = await fetch("/api/estagios");

    if (resEstagios.ok) {
      return;
    }
    setErro("Erro ao carregar configuracoes.");
  }, []);

  useEffect(() => {
    const carregarInicial = async () => {
      await bootstrap();
    };

    void carregarInicial();

    pollingRef.current = setInterval(() => {
      void bootstrap();
    }, INATIVA_POLLING_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [bootstrap, INATIVA_POLLING_MS]);

  return {
    erro,
  };
}
