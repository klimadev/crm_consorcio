"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
  gerarParcelas,
  listarParcelasLead,
  pagarParcela as apiPagarParcela,
  atualizarParcela as apiAtualizarParcela,
  excluirParcelasLead,
  excluirParcela as apiExcluirParcela,
  type Parcela,
} from "@/lib/api/parcelas";
import { computarStatusParcelas } from "@/lib/financeiro/parcelas";
import type { ModoCancelamento } from "@/modules/parcelas/components/cancelar-parcela-dialog";
import { aplicaMascaraMoedaBr, converteMoedaBrParaNumero } from "@/lib/utils";

type UseLeadParcelasParams = {
  leadId?: string;
};

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

export function useLeadParcelas({ leadId }: UseLeadParcelasParams) {
  const { addToast } = useToast();
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [valorTotal, setValorTotal] = useState("");
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("");
  const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState(hojeIso());

  const [gerando, setGerando] = useState(false);
  const [pagando, setPagando] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState<string | null>(null);
  const [deletandoParcela, setDeletandoParcela] = useState<string | null>(null);
  const [cancelandoParcela, setCancelandoParcela] = useState<string | null>(null);
  const [reabrindoParcela, setReabrindoParcela] = useState<string | null>(null);

  const carregarParcelas = useCallback(async () => {
    if (!leadId) {
      setParcelas([]);
      return;
    }
    setLoading(true);
    setError(null);

    const resultado = await listarParcelasLead(leadId, { limit: 300 });
    if (!resultado.ok) {
      setError(resultado.erro);
      setLoading(false);
      return;
    }

    setParcelas(computarStatusParcelas(resultado.dados.parcelas));
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void carregarParcelas();
    }, 0);

    return () => clearTimeout(timer);
  }, [carregarParcelas]);

  const atualizarValorTotal = useCallback((valor: string) => {
    setValorTotal(aplicaMascaraMoedaBr(valor));
  }, []);

  const gerarPlano = useCallback(async () => {
    if (!leadId) return;
    setGerando(true);
    setError(null);

    const valorTotalNumero = converteMoedaBrParaNumero(valorTotal);
    const quantidade = Number(quantidadeParcelas);
    const valorPorParcela = valorTotalNumero / quantidade;

    const resultado = await gerarParcelas({
      id_lead: leadId,
      valor_parcela: valorPorParcela,
      quantidade_parcelas: quantidade,
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
      description: `${quantidade} parcelas de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorPorParcela)} geradas.`,
    });

    setGerando(false);
    setValorTotal("");
    setQuantidadeParcelas("");
    await carregarParcelas();
  }, [addToast, carregarParcelas, dataPrimeiroVencimento, leadId, quantidadeParcelas, valorTotal]);

  const pagarParcela = useCallback(
    async (idParcela: string, dataPagamento?: string) => {
      const dataEfetiva = dataPagamento ?? new Date().toISOString();
      setPagando(idParcela);
      setError(null);

      const backup = parcelas;
      setParcelas((anterior) =>
        anterior.map((item) =>
          item.id === idParcela
            ? { ...item, status: "PAGA", data_pagamento: dataEfetiva }
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

  const removerPlano = useCallback(async (forcar = false) => {
    if (!leadId) return;
    setRemovendo(true);
    setError(null);

    const resultado = await excluirParcelasLead(leadId, forcar);

    if (!resultado.ok) {
      setError(resultado.erro);
      setRemovendo(false);
      return;
    }

    addToast({
      type: "success",
      title: forcar ? "Plano removido" : resultado.dados.preservadas_pagas > 0 ? "Pendentes removidas" : "Plano removido",
      description: forcar
        ? `${resultado.dados.excluidas} parcelas foram removidas (incluindo pagas).`
        : resultado.dados.preservadas_pagas > 0
          ? `${resultado.dados.excluidas} parcelas pendentes foram removidas e ${resultado.dados.preservadas_pagas} pagamento(s) ja registrado(s) foram preservados.`
          : `${resultado.dados.excluidas} parcelas foram removidas.`,
    });

    setRemovendo(false);
    await carregarParcelas();
  }, [addToast, carregarParcelas, leadId]);

  const excluirParcelaInd = useCallback(
    async (idParcela: string) => {
      setDeletandoParcela(idParcela);
      setError(null);

      const resultado = await apiExcluirParcela(idParcela);
      if (!resultado.ok) {
        if (resultado.erro && resultado.erro !== "Parcela nao encontrada.") {
          setError(resultado.erro);
        }
        setDeletandoParcela(null);
        return;
      }

      addToast({ type: "success", title: "Parcela excluida", description: "A parcela foi removida com sucesso." });
      setDeletandoParcela(null);
      await carregarParcelas();
    },
    [addToast, carregarParcelas],
  );

  const cancelarParcela = useCallback(
    async (idParcela: string, modo: ModoCancelamento, motivo?: string) => {
      setCancelandoParcela(idParcela);
      setError(null);

      const resposta = await fetch(`/api/parcelas/${encodeURIComponent(idParcela)}/cancelar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo, ...(motivo ? { motivo } : {}) }),
      });
      const json = (await resposta.json().catch(() => ({}))) as {
        ok?: boolean;
        canceladas?: number;
        abortadas?: number;
        erro?: string;
      };

      if (!resposta.ok || !json.ok) {
        setError(json.erro ?? "Erro ao cancelar parcela.");
        setCancelandoParcela(null);
        return false;
      }

      addToast({
        type: "success",
        title: "Parcela cancelada",
        description:
          json.abortadas && json.abortadas > 0
            ? `A parcela foi cancelada e ${json.abortadas} parcela(s) futura(s) foram abortadas.`
            : "A parcela foi marcada como cancelada.",
      });

      setCancelandoParcela(null);
      await carregarParcelas();
      return true;
    },
    [addToast, carregarParcelas],
  );

  const reabrirParcela = useCallback(
    async (idParcela: string) => {
      setReabrindoParcela(idParcela);
      setError(null);

      const resposta = await fetch(`/api/parcelas/${encodeURIComponent(idParcela)}/reabrir`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await resposta.json().catch(() => ({}))) as { ok?: boolean; erro?: string };

      if (!resposta.ok || !json.ok) {
        setError(json.erro ?? "Erro ao reabrir parcela.");
        setReabrindoParcela(null);
        return false;
      }

      addToast({
        type: "success",
        title: "Parcela reaberta",
        description: "A parcela voltou para o fluxo de cobranca.",
      });

      setReabrindoParcela(null);
      await carregarParcelas();
      return true;
    },
    [addToast, carregarParcelas],
  );

  const editarParcela = useCallback(
    async (idParcela: string, dados: { valor: number; data_vencimento: string }) => {
      setSalvandoEdicao(idParcela);
      setError(null);

      const resultado = await apiAtualizarParcela(idParcela, dados);
      if (!resultado.ok) {
        setError(resultado.erro);
        setSalvandoEdicao(null);
        return false;
      }

      setParcelas((atual) =>
        computarStatusParcelas(
          atual.map((parcela) => (parcela.id === idParcela ? resultado.dados.parcela : parcela)),
        ),
      );
      addToast({
        type: "success",
        title: "Parcela atualizada",
        description: "Os dados da parcela foram corrigidos com sucesso.",
      });
      setSalvandoEdicao(null);
      return true;
    },
    [addToast],
  );

  const limparFormulario = useCallback(() => {
    setValorTotal("");
    setQuantidadeParcelas("");
    setDataPrimeiroVencimento(hojeIso());
  }, []);

  return {
    parcelas,
    loading,
    error,
    valorTotal,
    setValorTotal: atualizarValorTotal,
    quantidadeParcelas,
    setQuantidadeParcelas,
    dataPrimeiroVencimento,
    setDataPrimeiroVencimento,
    gerarPlano,
    gerando,
    pagarParcela,
    pagando,
    temParcelas: parcelas.length > 0,
    removerPlano,
    removendo,
    editarParcela,
    salvandoEdicao,
    deletandoParcela,
    excluirParcela: excluirParcelaInd,
    cancelarParcela,
    cancelandoParcela,
    reabrirParcela,
    reabrindoParcela,
    limparFormulario,
  };
}
