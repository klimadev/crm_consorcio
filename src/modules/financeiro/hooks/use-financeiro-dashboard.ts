"use client";

import { useCallback, useEffect, useState } from "react";
import { listarParcelasDashboard, pagarParcela as apiPagarParcela, type ParcelaComLead, type TabFinanceiro } from "@/lib/api/parcelas";

export function useFinanceiroDashboard() {
  const [tabAtiva, setTabAtiva] = useState<TabFinanceiro>("proximos");
  const [parcelas, setParcelas] = useState<ParcelaComLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const resultado = await listarParcelasDashboard(tabAtiva);

    if (!resultado.ok) {
      setError(resultado.erro);
      setLoading(false);
      return;
    }

    setParcelas(resultado.dados.parcelas);
    setLoading(false);
  }, [tabAtiva]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void carregar();
    }, 0);

    return () => clearTimeout(timer);
  }, [carregar]);

  const pagarParcela = useCallback(
    async (idParcela: string, dataPagamento?: string) => {
      const dataEfetiva = dataPagamento ?? new Date().toISOString();
      setPagando(idParcela);

      const backup = parcelas;
      setParcelas((anterior) => anterior.filter((item) => item.id !== idParcela));

      const resultado = await apiPagarParcela(idParcela, { data_pagamento: dataEfetiva });
      if (!resultado.ok) {
        setParcelas(backup);
        setError(resultado.erro);
      }

      setPagando(null);
    },
    [parcelas],
  );

  return {
    tabAtiva,
    setTabAtiva,
    parcelas,
    loading,
    error,
    pagarParcela,
    pagando,
    contadores: {
      proximos: tabAtiva === "proximos" ? parcelas.length : null,
      atrasados: tabAtiva === "atrasados" ? parcelas.length : null,
      recebidos: tabAtiva === "recebidos" ? parcelas.length : null,
    },
  };
}
