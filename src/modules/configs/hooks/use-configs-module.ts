"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Estagio, UseConfigsReturn } from "../types";

export function useConfigsModule(): UseConfigsReturn {
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const INATIVA_POLLING_MS = 15000;

  const bootstrap = useCallback(async () => {
    const resEstagios = await fetch("/api/estagios");

    if (resEstagios.ok) {
      const json = await resEstagios.json();
      setEstagios(json.estagios ?? []);
    }
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

  const atualizarEstagio = useCallback(async (id: string, nome: string, ordem: number) => {
    setErro(null);
    const estagioAnterior = estagios.find((item) => item.id === id);
    if (!estagioAnterior) return;

    const nomeAtualizado = nome.trim();
    if (!nomeAtualizado) return;

    setEstagios((atual) =>
      atual.map((item) =>
        item.id === id ? { ...item, nome: nomeAtualizado, ordem } : item,
      ),
    );

    const resposta = await fetch(`/api/estagios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeAtualizado, ordem }),
    });

    if (!resposta.ok) {
      const json = (await resposta.json()) as { erro?: string };
      setErro(json.erro ?? "Erro ao atualizar estagio.");
      setEstagios((atual) =>
        atual.map((item) => (item.id === id ? estagioAnterior : item)),
      );
    }
  }, [estagios]);

  return {
    estagios,
    erro,
    atualizarEstagio,
  };
}
