"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
  gerarParcelas,
  listarParcelasLead,
  pagarParcela as apiPagarParcela,
  atualizarParcela as apiAtualizarParcela,
  excluirParcelasLead,
  type Parcela,
} from "@/lib/api/parcelas";
import { computarStatusParcelas } from "@/lib/financeiro/parcelas";
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

  const removerPlano = useCallback(async () => {
    if (!leadId) return;
    setRemovendo(true);
    setError(null);

    const resultado = await excluirParcelasLead(leadId);

    if (!resultado.ok) {
      setError(resultado.erro);
      setRemovendo(false);
      return;
    }

    addToast({
      type: "success",
      title: resultado.dados.preservadas_pagas > 0 ? "Pendentes removidas" : "Plano removido",
      description:
        resultado.dados.preservadas_pagas > 0
          ? `${resultado.dados.excluidas} parcelas pendentes foram removidas e ${resultado.dados.preservadas_pagas} pagamento(s) ja registrado(s) foram preservados.`
          : `${resultado.dados.excluidas} parcelas foram removidas.`,
    });

    setRemovendo(false);
    await carregarParcelas();
  }, [addToast, carregarParcelas, leadId]);

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
    limparFormulario,
  };
}
