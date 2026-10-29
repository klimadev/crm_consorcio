"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { listarRecebimentos, type RecebimentosResposta } from "@/lib/api/recebimentos";
import {
  atualizarParcela as apiAtualizarParcela,
  listarParcelasLead,
  pagarParcela as apiPagarParcela,
  type Parcela,
} from "@/lib/api/parcelas";
import { computarStatusParcelas } from "@/lib/financeiro/parcelas";
import type { ModoCancelamento } from "@/modules/parcelas/components/cancelar-parcela-dialog";
import { useToast } from "@/components/ui/toast";
import { formataMoeda } from "@/lib/utils";
import type { ChipCarteira, RecebimentosFiltroForm, UseRecebimentosModuleReturn } from "../types";

export function useRecebimentosModule(): UseRecebimentosModuleReturn {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Filtros vivem na URL: um corte bom sobrevive a F5 e pode ser compartilhado.
  const filtros = useMemo<RecebimentosFiltroForm>(
    () => ({
      busca: searchParams.get("busca") ?? "",
      data_inicial: searchParams.get("data_inicial") ?? "",
      data_final: searchParams.get("data_final") ?? "",
      id_pdv: searchParams.get("id_pdv") ?? "",
      id_funcionario: searchParams.get("id_funcionario") ?? "",
    }),
    [searchParams],
  );

  const mudarFiltro = useCallback(
    (patch: Partial<RecebimentosFiltroForm>) => {
      const proximo = { ...filtros, ...patch };
      const params = new URLSearchParams();
      for (const [chave, valor] of Object.entries(proximo)) {
        if (valor) params.set(chave, valor);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filtros, pathname, router],
  );
  // A busca responde ao que a pessoa digita sem martelar a API a cada tecla:
  // o input é imediato, a URL (e o fetch) esperam 350ms de pausa.
  const [buscaDigitada, setBuscaDigitada] = useState(filtros.busca);
  useEffect(() => {
    if (buscaDigitada === filtros.busca) return;
    const timer = setTimeout(() => mudarFiltro({ busca: buscaDigitada }), 350);
    return () => clearTimeout(timer);
  }, [buscaDigitada, filtros.busca, mudarFiltro]);

  // Stale-while-revalidate: a primeira carga mostra skeleton; recargas
  // seguintes mantêm os dados na tela com apenas um sinal de atualização.
  const [dados, setDados] = useState<RecebimentosResposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      setAtualizando(true);
      const resultado = await listarRecebimentos(filtros);
      if (!ativo) return;

      if (resultado.ok) {
        setDados(resultado.dados);
        setErro(null);
      } else {
        setErro(resultado.erro);
      }

      setCarregando(false);
      setAtualizando(false);
    };

    void carregar();
    return () => {
      ativo = false;
    };
  }, [filtros, chaveRecarga]);

  // Chips filtram a carteira no cliente: feedback instantâneo, zero refetch.
  const [chip, setChip] = useState<ChipCarteira>("em_atraso");

  const carteira = useMemo(() => dados?.carteira ?? [], [dados]);
  const contadoresChips = useMemo<Record<ChipCarteira, number>>(
    () => ({
      em_atraso: carteira.filter((cliente) => cliente.estado === "em_atraso").length,
      em_dia: carteira.filter((cliente) => cliente.estado === "em_dia").length,
      todos: carteira.length,
    }),
    [carteira],
  );

  const carteiraFiltrada = useMemo(() => {
    if (chip === "em_atraso") return carteira.filter((cliente) => cliente.estado === "em_atraso");
    if (chip === "em_dia") return carteira.filter((cliente) => cliente.estado === "em_dia");
    return carteira;
  }, [carteira, chip]);

  const kpis = useMemo(() => {
    if (!dados?.resumo) return [];

    return [
      {
        id: "recebido",
        rotulo: "Recebido no período",
        valor: formataMoeda(dados.resumo.totalRecebidoPeriodo),
        apoio: `${dados.resumo.quantidadeRecebidas} pagamentos registrados`,
        tom: "emerald" as const,
        tendencia: `${dados.resumo.variacaoRecebidoPeriodo >= 0 ? "+" : ""}${dados.resumo.variacaoRecebidoPeriodo.toFixed(1)}% vs período anterior`,
        tendenciaPositiva: dados.resumo.variacaoRecebidoPeriodo >= 0,
      },
      {
        id: "aberto",
        rotulo: "A receber (futuro)",
        valor: formataMoeda(dados.resumo.totalEmAberto),
        apoio: `${dados.resumo.quantidadePendentes} parcelas a vencer`,
        tom: "blue" as const,
      },
      {
        id: "atrasado",
        rotulo: "Em atraso",
        valor: formataMoeda(dados.resumo.totalAtrasado),
        apoio: `${dados.resumo.quantidadeAtrasadas} parcelas vencidas para cobrar`,
        tom: "rose" as const,
      },
      {
        id: "em-dia",
        rotulo: "Pagamentos em dia",
        valor: `${dados.resumo.taxaAdimplencia.toFixed(1)}%`,
        apoio: `${dados.resumo.parcelasVencendo7Dias} vencem nos próximos 7 dias`,
        tom: "amber" as const,
      },
    ];
  }, [dados]);

  // Expansão do cliente: parcelas chegam lazy, só quando o card abre.
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);
  const [parcelasExpandidas, setParcelasExpandidas] = useState<Record<string, Parcela[]>>({});
  const [expandindo, setExpandindo] = useState<string | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);
  const [cancelandoParcela, setCancelandoParcela] = useState<string | null>(null);

  const carregarParcelasCliente = useCallback(async (idLead: string) => {
    setExpandindo(idLead);
    const resultado = await listarParcelasLead(idLead, { limit: 300 });

    if (!resultado.ok) {
      setErro(resultado.erro);
      setExpandindo(null);
      return;
    }

    setParcelasExpandidas((atual) => ({
      ...atual,
      [idLead]: computarStatusParcelas(resultado.dados.parcelas),
    }));
    setExpandindo(null);
  }, []);

  const alternarExpansao = useCallback(
    (idLead: string) => {
      if (clienteExpandido === idLead) {
        setClienteExpandido(null);
        return;
      }
      setClienteExpandido(idLead);
      setParcelasExpandidas((atual) => {
        if (atual[idLead]) return atual;
        void carregarParcelasCliente(idLead);
        return atual;
      });
    },
    [carregarParcelasCliente, clienteExpandido],
  );

  // A nota de cobrança ("cliente pediu prazo até sexta") viaja com a parcela:
  // PATCH /api/parcelas/[id] com observacao_cobranca.
  const salvarObservacao = useCallback(
    async (idParcela: string, idLead: string, observacao: string | null) => {
      const resultado = await apiAtualizarParcela(idParcela, { observacao_cobranca: observacao });

      if (!resultado.ok) {
        addToast({ type: "error", title: "Erro ao salvar observação", description: resultado.erro });
        return false;
      }

      setParcelasExpandidas((atual) => ({
        ...atual,
        [idLead]: (atual[idLead] ?? []).map((parcela) =>
          parcela.id === idParcela ? resultado.dados.parcela : parcela,
        ),
      }));
      return true;
    },
    [addToast],
  );

  // O backend já suporta reverter pagamento: PATCH /api/parcelas/[id] com
  // data_pagamento: null devolve a parcela para AGUARDANDO. O undo é isso.
  const desfazerPagamento = useCallback(
    async (idParcela: string, idLead: string) => {
      setPagando(idParcela);

      const resultado = await apiAtualizarParcela(idParcela, { data_pagamento: null });

      if (!resultado.ok) {
        addToast({ type: "error", title: "Erro ao desfazer pagamento", description: resultado.erro });
        setPagando(null);
        return;
      }

      addToast({
        type: "info",
        title: "Pagamento desfeito",
        description: "A parcela voltou para a cobrança.",
      });

      setPagando(null);
      setChaveRecarga((atual) => atual + 1);
      void carregarParcelasCliente(idLead);
    },
    [addToast, carregarParcelasCliente],
  );

  const pagarParcelaModule = useCallback(
    async (idParcela: string, idLead: string, dataPagamento?: string) => {
      const dataEfetiva = dataPagamento ?? new Date().toISOString();
      const parcelaAntiga = parcelasExpandidas[idLead]?.find((parcela) => parcela.id === idParcela) ?? null;
      const cliente = carteira.find((linha) => linha.id_lead === idLead) ?? null;
      setPagando(idParcela);
      setErro(null);

      const backup = parcelasExpandidas[idLead] ?? [];
      setParcelasExpandidas((atual) => ({
        ...atual,
        [idLead]: (atual[idLead] ?? []).map((parcela) =>
          parcela.id === idParcela
            ? { ...parcela, status: "PAGA", data_pagamento: dataEfetiva }
            : parcela,
        ),
      }));

      const resultado = await apiPagarParcela(idParcela, { data_pagamento: dataEfetiva });

      if (!resultado.ok) {
        setParcelasExpandidas((atual) => ({ ...atual, [idLead]: backup }));
        setErro(resultado.erro);
        addToast({
          type: "error",
          title: "Erro ao registrar pagamento",
          description: resultado.erro,
        });
        setPagando(null);
        return;
      }

      addToast({
        type: "success",
        title: `Pagamento registrado${parcelaAntiga ? ` · ${formataMoeda(parcelaAntiga.valor)}` : ""}`,
        description: cliente?.nome,
        action: { label: "Desfazer", run: () => void desfazerPagamento(idParcela, idLead) },
        duration: 8000,
      });

      setPagando(null);
      setChaveRecarga((atual) => atual + 1);
      void carregarParcelasCliente(idLead);
    },
    [addToast, carteira, carregarParcelasCliente, desfazerPagamento, parcelasExpandidas],
  );

  // A desistência nasce na cobrança: cancelar daqui, sem sair da carteira.
  const cancelarParcelaModule = useCallback(
    async (idParcela: string, idLead: string, modo: ModoCancelamento, motivo?: string) => {
      setCancelandoParcela(idParcela);
      setErro(null);

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
        const mensagem = json.erro ?? "Erro ao cancelar parcela.";
        setErro(mensagem);
        addToast({ type: "error", title: "Erro ao cancelar parcela", description: mensagem });
        setCancelandoParcela(null);
        return false;
      }

      addToast({
        type: "success",
        title: "Parcela cancelada",
        description:
          json.abortadas && json.abortadas > 0
            ? `A parcela foi cancelada e ${json.abortadas} futura(s) também foram canceladas.`
            : "A parcela foi cancelada.",
      });

      setCancelandoParcela(null);
      setChaveRecarga((atual) => atual + 1);
      void carregarParcelasCliente(idLead);
      return true;
    },
    [addToast, carregarParcelasCliente],
  );

  // Encerrar o plano = cancelar a partir da parcela onde parou.
  const encerrarPlanoModule = useCallback(
    async (idParcelaParada: string, idLead: string, motivo?: string) =>
      cancelarParcelaModule(idParcelaParada, idLead, "SUBSEQUENTES", motivo),
    [cancelarParcelaModule],
  );

  return {
    carregando,
    atualizando,
    erro,
    carteira,
    carteiraFiltrada,
    contadoresChips,
    chip,
    setChip,
    resumo: dados?.resumo ?? null,
    graficos: dados?.graficos ?? { recebimentosPorPeriodo: [], distribuicaoStatus: [] },
    churn: {
      totalPerdidoChurn: dados?.resumo?.totalPerdidoChurn ?? 0,
      quantidadePerdidas: dados?.resumo?.quantidadePerdidas ?? 0,
      taxaRetencaoParcelas: dados?.resumo?.taxaRetencaoParcelas ?? 1,
      churnPorParcela: dados?.resumo?.churnPorParcela ?? [],
    },
    kpis,
    filtros,
    buscaDigitada,
    setBusca: setBuscaDigitada,
    temFiltrosAtivos: Boolean(
      filtros.busca || filtros.data_inicial || filtros.data_final || filtros.id_pdv || filtros.id_funcionario,
    ),
    limparFiltros: () => {
      setBuscaDigitada("");
      router.replace(pathname, { scroll: false });
    },
    setDataInicial: (valor: string) => mudarFiltro({ data_inicial: valor }),
    setDataFinal: (valor: string) => mudarFiltro({ data_final: valor }),
    setIdPdv: (valor: string) => mudarFiltro({ id_pdv: valor }),
    setIdFuncionario: (valor: string) => mudarFiltro({ id_funcionario: valor }),
    opcoesPdvs: dados?.opcoes.pdvs ?? [],
    opcoesResponsaveis: dados?.opcoes.responsaveis ?? [],
    clienteExpandido,
    parcelasExpandidas,
    expandindo,
    alternarExpansao,
    carregarParcelasCliente,
    salvarObservacao,
    pagando,
    cancelandoParcela,
    pagarParcela: pagarParcelaModule,
    cancelarParcela: cancelarParcelaModule,
    encerrarPlano: encerrarPlanoModule,
  };
}
