"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
  gerarParcelas,
  listarParcelasLead,
  pagarParcela as apiPagarParcela,
  type Parcela,
} from "@/lib/api/parcelas";
import { aplicaMascaraMoedaBr, converteMoedaBrParaNumero } from "@/lib/utils";

type UseLeadParcelasParams = {
  leadId?: string;
};

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function computarStatus(parcelas: Parcela[]): Parcela[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return parcelas.map((parcela) => {
    if (parcela.status === "PAGO") return parcela;
    const vencimento = new Date(parcela.data_vencimento);
    vencimento.setHours(0, 0, 0, 0);
    return { ...parcela, status: vencimento < hoje ? "ATRASADO" : "PENDENTE" };
  });
}

export function useLeadParcelas({ leadId }: UseLeadParcelasParams) {
  const { addToast } = useToast();
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [valorParcela, setValorParcela] = useState("");
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("");
  const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState(hojeIso());

  const [gerando, setGerando] = useState(false);
  const [pagando, setPagando] = useState<string | null>(null);

  const carregarParcelas = useCallback(async () => {
    if (!leadId) {
      setParcelas([]);
      return;
    }
    setLoading(true);
    setError(null);

    const resultado = await listarParcelasLead(leadId);
    if (!resultado.ok) {
      setError(resultado.erro);
      setLoading(false);
      return;
    }

    setParcelas(computarStatus(resultado.dados.parcelas));
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void carregarParcelas();
    }, 0);

    return () => clearTimeout(timer);
  }, [carregarParcelas]);

  const atualizarValorParcela = useCallback((valor: string) => {
    setValorParcela(aplicaMascaraMoedaBr(valor));
  }, []);

  const gerarPlano = useCallback(async () => {
    if (!leadId) return;
    setGerando(true);
    setError(null);

    const resultado = await gerarParcelas({
      id_lead: leadId,
      valor_parcela: converteMoedaBrParaNumero(valorParcela),
      quantidade_parcelas: Number(quantidadeParcelas),
      data_primeiro_vencimento: dataPrimeiroVencimento,
    });

    if (!resultado.ok) {
      setError(resultado.erro);
      setGerando(false);
      return;
    }

    addToast({
      type: "success",
      title: "Plano de pagamento criado",
      description: `${resultado.dados.parcelas_criadas} parcelas geradas para este lead.`,
    });

    setGerando(false);
    await carregarParcelas();
  }, [addToast, carregarParcelas, dataPrimeiroVencimento, leadId, quantidadeParcelas, valorParcela]);

  const pagarParcela = useCallback(
    async (idParcela: string, dataPagamento?: string) => {
      const dataEfetiva = dataPagamento ?? new Date().toISOString();
      setPagando(idParcela);
      setError(null);

      const backup = parcelas;
      setParcelas((anterior) =>
        anterior.map((item) =>
          item.id === idParcela
            ? { ...item, status: "PAGO", data_pagamento: dataEfetiva }
            : item,
        ),
      );

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
    parcelas,
    loading,
    error,
    valorParcela,
    setValorParcela: atualizarValorParcela,
    quantidadeParcelas,
    setQuantidadeParcelas,
    dataPrimeiroVencimento,
    setDataPrimeiroVencimento,
    gerarPlano,
    gerando,
    pagarParcela,
    pagando,
    temParcelas: parcelas.length > 0,
  };
}
