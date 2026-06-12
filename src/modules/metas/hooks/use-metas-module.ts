"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { listarPdvs } from "@/lib/api/equipe";
import {
  listarMetas,
  criarMeta as criarMetaApi,
  editarMeta as editarMetaApi,
  desativarMeta as desativarMetaApi,
  obterRanking,
} from "@/modules/metas/api/metas";
import type {
  ComparacaoItem,
  ComparacaoPeriodo,
  Meta,
  MetaFormData,
  PeriodoDisponivel,
  ProporcaoItem,
  RankingItem,
  ResumoMetas,
  UseMetasModuleReturn,
} from "@/modules/metas/types";
import { agregarProgressoEquipe } from "@/modules/metas/lib/calculator";
import { obterMesReferencia } from "@/modules/metas/lib/dates";

/** Gera lista de meses disponíveis (últimos 6 + atual + próximo) */
function gerarPeriodosDisponiveis(metasMeses: Set<string>): PeriodoDisponivel[] {
  const meses = new Date();
  const periodos: PeriodoDisponivel[] = [];
  const nomes = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  // Gera os últimos 6 meses + atual + próximo (até 8 meses)
  for (let i = -6; i <= 1; i++) {
    const d = new Date(meses.getUTCFullYear(), meses.getUTCMonth() + i, 1);
    const ano = d.getUTCFullYear();
    const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
    const key = `${ano}-${mes}`;
    const label = `${nomes[d.getUTCMonth()]}/${ano}`;
    periodos.push({ mes: key, label });
  }

  // Se algum mês das metas não estiver na lista, adiciona
  for (const mes of metasMeses) {
    if (!periodos.find((p) => p.mes === mes)) {
      const [ano, m] = mes.split("-").map(Number);
      const label = `${nomes[(m ?? 1) - 1]}/${ano}`;
      periodos.push({ mes, label });
    }
  }

  // Ordena decrescente (mais recente primeiro)
  periodos.sort((a, b) => b.mes.localeCompare(a.mes));
  return periodos;
}

/** Calcula proporção de cada equipe nas metas */
function calcularProporcao(
  metasPorEquipe: Map<string, Meta[]>,
  ranking: RankingItem[],
): ProporcaoItem[] {
  const rankingMap = new Map(ranking.map((r) => [r.id_equipe, r]));

  return Array.from(metasPorEquipe.entries())
    .map(([id_equipe, metas]) => {
      const progresso = agregarProgressoEquipe(
        metas.filter((m) => m.progresso),
      );
      const nome = metas[0]?.equipe?.nome ?? rankingMap.get(id_equipe)?.nome ?? "Equipe";
      const media = progresso.media_percentual;

      let cor = "bg-success";
      if (media < 45) cor = "bg-destructive";
      else if (media < 80) cor = "bg-warning";

      return {
        id_equipe,
        nome,
        percentual: media,
        cor,
      };
    })
    .sort((a, b) => b.percentual - a.percentual);
}

// Mês anterior para comparação
function mesAnterior(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  if (!ano || !m) return mes;
  const d = new Date(ano, m - 2, 1);
  return obterMesReferencia(d);
}

export function useMetasModule(props: {
  perfil: string;
  id_pdv?: string | null;
  modo: "painel";
}): UseMetasModuleReturn {
  const { addToast } = useToast();
  const { perfil, id_pdv, modo } = props;

  const [metas, setMetas] = useState<Meta[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [mediaGeral, setMediaGeral] = useState(0);
  const [totalParticipantes, setTotalParticipantes] = useState(0);
  const [opcoesEquipes, setOpcoesEquipes] = useState<Array<{ id: string; nome: string }>>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [wizardAberto, setWizardAberto] = useState(false);
  const [metaEmEdicao, setMetaEmEdicao] = useState<Meta | null>(null);
  const [equipeSelecionada, setEquipeSelecionada] = useState<string | null>(id_pdv ?? null);

  // Period filter states
  const [mesReferencia, setMesReferencia] = useState(obterMesReferencia(new Date()));
  const [comparacaoAtiva, setComparacaoAtiva] = useState(false);
  const [mesComparacao, setMesComparacao] = useState("");
  const [dadosComparacao, setDadosComparacao] = useState<ComparacaoPeriodo | null>(null);
  const [carregandoComparacao, setCarregandoComparacao] = useState(false);
  const [metasMeses, setMetasMeses] = useState<Set<string>>(new Set());

  const podeCriarMeta = perfil === "EMPRESA" || perfil === "GERENTE";

  const carregarOpcoes = useCallback(async () => {
    const resposta = await listarPdvs();
    if (!resposta.ok) {
      return { erro: resposta.erro };
    }

    const pdvsFiltrados = resposta.dados.pdvs.filter((pdv) => {
      if (perfil === "EMPRESA") return true;
      return pdv.id === id_pdv;
    });

    const proximos = pdvsFiltrados.map((pdv) => ({ id: pdv.id, nome: pdv.nome }));
    setOpcoesEquipes(proximos);

    if (perfil !== "EMPRESA" && proximos[0]?.id) {
      setEquipeSelecionada(proximos[0].id);
    }

    return { erro: null };
  }, [id_pdv, perfil]);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const [opcoesResultado, metasResultado, rankingResultado] = await Promise.all([
        carregarOpcoes(),
        listarMetas({ ativo: true, mes_referencia: mesReferencia }),
        obterRanking({ mes_referencia: mesReferencia }),
      ]);

      if (opcoesResultado.erro) {
        setErro(opcoesResultado.erro);
      }

      if (!metasResultado.ok) {
        setErro(metasResultado.erro);
        setMetas([]);
      } else {
        setMetas(metasResultado.dados.metas);
        // Extrai meses únicos das metas carregadas (para o histórico)
        const meses = new Set<string>();
        for (const m of metasResultado.dados.metas) {
          meses.add(m.mes_referencia);
        }
        setMetasMeses((prev) => {
          const novo = new Set(prev);
          for (const m of meses) novo.add(m);
          return novo;
        });
      }

      if (!rankingResultado.ok) {
        setRanking([]);
        setMediaGeral(0);
        setTotalParticipantes(0);
        setErro((atual) => atual ?? rankingResultado.erro);
      } else {
        setRanking(rankingResultado.dados.ranking);
        setMediaGeral(rankingResultado.dados.media_geral);
        setTotalParticipantes(rankingResultado.dados.total_participantes);
      }
    } finally {
      setCarregando(false);
    }
  }, [carregarOpcoes, mesReferencia]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  // Carrega dados de comparação quando ativado
  useEffect(() => {
    if (!comparacaoAtiva || !mesComparacao) {
      setDadosComparacao(null);
      return;
    }

    let ativo = true;
    setCarregandoComparacao(true);

    const carregar = async () => {
      try {
        const resultado = await obterRanking({ mes_referencia: mesComparacao });
        if (!ativo) return;

        if (!resultado.ok) {
          setDadosComparacao(null);
        } else {
          setDadosComparacao({
            mes_referencia: mesComparacao,
            ranking: resultado.dados.ranking,
            media_geral: resultado.dados.media_geral,
            total_participantes: resultado.dados.total_participantes,
          });
        }
      } finally {
        if (ativo) setCarregandoComparacao(false);
      }
    };

    void carregar();
    return () => { ativo = false; };
  }, [comparacaoAtiva, mesComparacao]);

  // Quando ativa comparação, define mês anterior como padrão
  useEffect(() => {
    if (comparacaoAtiva && !mesComparacao) {
      setMesComparacao(mesAnterior(mesReferencia));
    }
  }, [comparacaoAtiva, mesComparacao, mesReferencia]);

  // Metas agrupadas por equipe
  const metasPorEquipe = useMemo(() => {
    const map = new Map<string, Meta[]>();
    for (const meta of metas) {
      const id = meta.id_equipe;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(meta);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => a.semana - b.semana);
    }
    return map;
  }, [metas]);

  // Resumo agrupa por equipe
  const resumo = useMemo<ResumoMetas>(() => {
    let totalEquipes = 0;
    let noRitmo = 0;
    let atencao = 0;
    let fora = 0;
    let somaPercentual = 0;

    for (const [, metasEquipe] of metasPorEquipe) {
      const progresso = agregarProgressoEquipe(
        metasEquipe.filter((m) => m.progresso),
      );
      totalEquipes++;
      somaPercentual += progresso.media_percentual;
      noRitmo += progresso.no_ritmo > 0 ? 1 : 0;
      atencao += progresso.atencao > 0 && progresso.no_ritmo === 0 ? 1 : 0;
      fora += progresso.fora > 0 && progresso.no_ritmo === 0 && progresso.atencao === 0 ? 1 : 0;
    }

    return {
      total_equipes: totalEquipes,
      no_ritmo: noRitmo,
      atencao,
      fora,
      media_percentual: totalEquipes > 0 ? Number((somaPercentual / totalEquipes).toFixed(1)) : 0,
    };
  }, [metasPorEquipe]);

  // Proporção por equipe
  const proporcaoEquipes = useMemo<ProporcaoItem[]>(
    () => calcularProporcao(metasPorEquipe, ranking),
    [metasPorEquipe, ranking],
  );

  // Períodos disponíveis
  const periodosDisponiveis = useMemo<PeriodoDisponivel[]>(
    () => gerarPeriodosDisponiveis(metasMeses),
    [metasMeses],
  );

  // Ranking com comparação (merge dados de comparação)
  const rankingComparado = useMemo<ComparacaoItem[]>(() => {
    if (!dadosComparacao) return ranking.map((r) => ({ ...r, delta_percentual: null }));

    const comparacaoMap = new Map(dadosComparacao.ranking.map((r) => [r.id_equipe, r]));
    return ranking.map((item) => {
      const anterior = comparacaoMap.get(item.id_equipe);
      return {
        ...item,
        delta_percentual: anterior
          ? Number((item.percentual - anterior.percentual).toFixed(1))
          : null,
      };
    });
  }, [ranking, dadosComparacao]);

  const abrirNovaMeta = useCallback(() => {
    setMetaEmEdicao(null);
    setWizardAberto(true);
  }, []);

  const abrirEdicao = useCallback((meta: Meta) => {
    setMetaEmEdicao(meta);
    setWizardAberto(true);
  }, []);

  const fecharWizard = useCallback(() => {
    setWizardAberto(false);
    setMetaEmEdicao(null);
  }, []);

  const criarMeta = useCallback(
    async (dados: MetaFormData): Promise<boolean> => {
      if (!dados.alvo || dados.alvo <= 0) {
        setErro("Informe um alvo válido para a meta.");
        return false;
      }

      setSalvando(true);
      setErro(null);

      try {
        const resposta = await criarMetaApi(dados);
        if (!resposta.ok) {
          setErro(resposta.erro);
          addToast({
            type: "error",
            title: "Não foi possível criar a meta",
            description: resposta.erro,
            duration: 4500,
          });
          return false;
        }

        addToast({
          type: "success",
          title: "Meta criada",
          description: "A nova meta já está pronta para acompanhar.",
          duration: 4000,
        });

        fecharWizard();
        await carregarDados();
        return true;
      } finally {
        setSalvando(false);
      }
    },
    [addToast, carregarDados, fecharWizard],
  );

  const editarMeta = useCallback(
    async (id: string, dados: Partial<MetaFormData>): Promise<boolean> => {
      setSalvando(true);
      setErro(null);

      try {
        const resposta = await editarMetaApi(id, dados);
        if (!resposta.ok) {
          setErro(resposta.erro);
          addToast({
            type: "error",
            title: "Não foi possível atualizar a meta",
            description: resposta.erro,
            duration: 4500,
          });
          return false;
        }

        addToast({
          type: "success",
          title: "Meta atualizada",
          description: "A meta foi atualizada com sucesso.",
          duration: 4000,
        });

        fecharWizard();
        await carregarDados();
        return true;
      } finally {
        setSalvando(false);
      }
    },
    [addToast, carregarDados, fecharWizard],
  );

  const arquivarMeta = useCallback(
    async (id: string): Promise<boolean> => {
      setSalvando(true);
      setErro(null);

      try {
        const resposta = await desativarMetaApi(id);
        if (!resposta.ok) {
          setErro(resposta.erro);
          addToast({
            type: "error",
            title: "Não foi possível arquivar a meta",
            description: resposta.erro,
            duration: 4500,
          });
          return false;
        }

        addToast({
          type: "success",
          title: "Meta arquivada",
          description: "A meta saiu da semana atual sem apagar o histórico.",
          duration: 3500,
        });

        await carregarDados();
        return true;
      } finally {
        setSalvando(false);
      }
    },
    [addToast, carregarDados],
  );

  return {
    metas,
    metasPorEquipe,
    ranking,
    rankingComparado,
    resumo,
    mediaGeral,
    totalParticipantes,
    opcoesEquipes,
    carregando,
    salvando,
    erro,
    equipeSelecionada,
    podeCriarMeta,
    setEquipeSelecionada,
    abrirNovaMeta,
    abrirEdicao,
    criarMeta,
    editarMeta,
    arquivarMeta,
    recarregar: carregarDados,
    wizardAberto,
    metaEmEdicao,
    fecharWizard,
    // Period filter
    mesReferencia,
    periodosDisponiveis,
    setMesReferencia,
    proporcaoEquipes,
    // Comparação períodos
    comparacaoAtiva,
    setComparacaoAtiva,
    mesComparacao,
    setMesComparacao,
    dadosComparacao,
    carregandoComparacao,
  };
}
