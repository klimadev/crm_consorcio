"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listarRecebimentos,
  type AbaRecebimentos,
  type DirecaoOrdenacao,
  type OrdenacaoRecebimentos,
  type RecebimentosResposta,
} from "@/lib/api/recebimentos";
import { pagarParcela as apiPagarParcela } from "@/lib/api/parcelas";
import { useToast } from "@/components/ui/toast";
import { formataMoeda } from "@/lib/utils";
import type { RecebimentosFiltroForm, UseRecebimentosModuleReturn } from "../types";

const FILTROS_INICIAIS: RecebimentosFiltroForm = {
  aba: "todos",
  busca: "",
  data_inicial: "",
  data_final: "",
  id_pdv: "",
  id_funcionario: "",
  ordenar: "vencimento",
  direcao: "asc",
};

function criarPromiseRecebimentos(filtros: RecebimentosFiltroForm, pagina: number, limite: number) {
  return listarRecebimentos({
    ...filtros,
    pagina,
    limite,
  });
}

export function useRecebimentosModule(): UseRecebimentosModuleReturn {
  const { addToast } = useToast();
  const [filtros, setFiltros] = useState<RecebimentosFiltroForm>(FILTROS_INICIAIS);
  const [pagina, setPagina] = useState(1);
  const [limite] = useState(20);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<RecebimentosResposta | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const [pagando, setPagando] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);

      const resultado = await criarPromiseRecebimentos(filtros, pagina, limite);

      if (!ativo) return;

      if (resultado.ok) {
        setDados(resultado.dados);
        setErro(null);
      } else {
        setDados(null);
        setErro(resultado.erro);
      }

      setCarregando(false);
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [filtros, pagina, limite, chaveRecarga]);

  const atualizarFiltro = useCallback(<T extends keyof RecebimentosFiltroForm>(chave: T, valor: RecebimentosFiltroForm[T]) => {
    setPagina(1);
    setFiltros((atual) => ({ ...atual, [chave]: valor }));
  }, []);

  const kpis = useMemo(() => {
    if (!dados?.resumo) return [];

    return [
      {
        id: "recebido",
        rotulo: "Recebido no periodo",
        valor: formataMoeda(dados.resumo.totalRecebidoPeriodo),
        apoio: `${dados.resumo.quantidadeRecebidas} parcelas compensadas`,
        tom: "emerald" as const,
        tendencia: `${dados.resumo.variacaoRecebidoPeriodo >= 0 ? "+" : ""}${dados.resumo.variacaoRecebidoPeriodo.toFixed(1)}% vs periodo anterior`,
      },
      {
        id: "aberto",
        rotulo: "Previsto a receber",
        valor: formataMoeda(dados.resumo.totalEmAberto),
        apoio: `${dados.resumo.quantidadePendentes} parcelas em aberto`,
        tom: "blue" as const,
      },
      {
        id: "atrasado",
        rotulo: "Em atraso",
        valor: formataMoeda(dados.resumo.totalAtrasado),
        apoio: `${dados.resumo.quantidadeAtrasadas} parcelas exigem acao`,
        tom: "rose" as const,
      },
      {
        id: "adimplencia",
        rotulo: "Taxa de adimplencia",
        valor: `${dados.resumo.taxaAdimplencia.toFixed(1)}%`,
        apoio: `${dados.resumo.parcelasVencendo7Dias} vencem nos proximos 7 dias`,
        tom: "amber" as const,
      },
    ];
  }, [dados]);

  const pagarParcelaModule = useCallback(
    async (idParcela: string, dataPagamento?: string) => {
      const dataEfetiva = dataPagamento ?? new Date().toISOString();
      setPagando(idParcela);
      setErro(null);

      const backup = dados;
      setDados((anterior) => {
        if (!anterior) return null;
        return {
          ...anterior,
          lista: anterior.lista.map((item) =>
            item.id === idParcela
              ? { ...item, status: "PAGO" as const, data_pagamento: dataEfetiva, dias_em_atraso: 0 }
              : item,
          ),
        };
      });

      const resultado = await apiPagarParcela(idParcela, { data_pagamento: dataEfetiva });

      if (!resultado.ok) {
        setDados(backup);
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
        title: "Pagamento registrado",
        description: "A parcela foi marcada como paga com sucesso.",
      });

      setPagando(null);
      setChaveRecarga((atual) => atual + 1);
    },
    [addToast, dados],
  );

  return {
    carregando,
    erro,
    recebimentos: dados?.lista ?? [],
    resumo: dados?.resumo ?? null,
    graficos: dados?.graficos ?? { recebimentosPorPeriodo: [], distribuicaoStatus: [] },
    contadoresAbas: dados?.contadoresAbas ?? { todos: 0, recebidos: 0, a_vencer: 0, atrasados: 0 },
    filtros,
    pagina,
    limite,
    totalPaginas: dados?.paginacao.totalPaginas ?? 1,
    totalRegistros: dados?.paginacao.total ?? 0,
    opcoesPdvs: dados?.opcoes.pdvs ?? [],
    opcoesResponsaveis: dados?.opcoes.responsaveis ?? [],
    kpis,
    temFiltrosAtivos: Boolean(
      filtros.busca || filtros.data_inicial || filtros.data_final || filtros.id_pdv || filtros.id_funcionario || filtros.aba !== "todos",
    ),
    setBusca: (valor: string) => atualizarFiltro("busca", valor),
    setAba: (aba: AbaRecebimentos) => atualizarFiltro("aba", aba),
    setDataInicial: (valor: string) => atualizarFiltro("data_inicial", valor),
    setDataFinal: (valor: string) => atualizarFiltro("data_final", valor),
    setIdPdv: (valor: string) => atualizarFiltro("id_pdv", valor),
    setIdFuncionario: (valor: string) => atualizarFiltro("id_funcionario", valor),
    setOrdenar: (valor: OrdenacaoRecebimentos) => atualizarFiltro("ordenar", valor),
    setDirecao: (valor: DirecaoOrdenacao) => atualizarFiltro("direcao", valor),
    limparFiltros: () => {
      setPagina(1);
      setFiltros(FILTROS_INICIAIS);
    },
    irParaPagina: (proximaPagina: number) => setPagina(proximaPagina),
    recarregar: async () => {
      setChaveRecarga((atual) => atual + 1);
    },
    pagando,
    pagarParcela: pagarParcelaModule,
  };
}
