"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { verificarBootstrapConfigs } from "@/lib/api/configs";
import type { UseConfigsReturn } from "../types";

export function useConfigsModule(): UseConfigsReturn {
  const [erro, setErro] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const INATIVA_POLLING_MS = 15000;

  const bootstrap = useCallback(async () => {
    const resultado = await verificarBootstrapConfigs();

    if (resultado.ok) {
      return;
    }
    setErro(resultado.erro);
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
