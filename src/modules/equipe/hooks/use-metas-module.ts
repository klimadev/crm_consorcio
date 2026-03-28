"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { listarPdvs } from "@/lib/api/equipe";
import {
  criarMeta as criarMetaApi,
  desativarMeta as desativarMetaApi,
  editarMeta as editarMetaApi,
  listarMetas,
  MEDICOES_META,
  obterRankingMetas,
  type MetaPayloadApi,
} from "@/lib/api/metas";
import type { OrigemResultadoMeta, PeriodoMeta, TipoMetaValor } from "@/lib/tipos";
import type {
  MetaFormState,
  MetaMedicao,
  MetaModuleItem,
  MetaOptionPdv,
  UseMetasModuleProps,
  UseMetasModuleReturn,
} from "../types/metas";

function hojeInput() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function inicioDaSemanaInput(dataBase?: string) {
  const base = dataBase ? new Date(`${dataBase}T12:00:00`) : new Date();
  const diaSemana = base.getDay() || 7;
  const inicio = new Date(base);
  inicio.setDate(base.getDate() - diaSemana + 1);
  return hojeLocalInput(inicio);
}

function hojeLocalInput(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function fimDaSemanaInput(dataBase?: string) {
  const base = dataBase ? new Date(`${dataBase}T12:00:00`) : new Date();
  const dia = base.getDay() || 7;
  const fim = new Date(base);
  fim.setDate(base.getDate() + (7 - dia));
  return hojeLocalInput(fim);
}

function inicioPadraoMetaSemanal() {
  const hoje = new Date();
  const diaSemana = hoje.getDay() || 7;

  if (diaSemana === 1) {
    return hojeInput();
  }

  const inicioSemanaAtual = new Date(`${inicioDaSemanaInput()}T12:00:00`);
  inicioSemanaAtual.setDate(inicioSemanaAtual.getDate() + 7);
  return hojeLocalInput(inicioSemanaAtual);
}

function criarFormularioInicial(idPdv?: string | null): MetaFormState {
  const inicio = inicioPadraoMetaSemanal();
  return {
    titulo: "",
    periodo: "SEMANAL",
    medicao: "VALOR_PAGAMENTOS",
    alvo: "",
    data_inicio: inicio,
    data_fim: fimDaSemanaInput(inicio),
    id_pdv: idPdv ?? "",
  };
}

function medicaoDaMeta(meta: Pick<MetaModuleItem, "tipo_meta" | "origem_resultado">): MetaMedicao {
  if (meta.tipo_meta === "VOLUME") {
    return "VOLUME_FECHADOS";
  }

  return meta.origem_resultado === "ESTAGIO_GANHO" ? "VALOR_FECHADOS" : "VALOR_PAGAMENTOS";
}

function definirMedicao(medicao: MetaMedicao): { tipo_meta: TipoMetaValor; origem_resultado: OrigemResultadoMeta } {
  switch (medicao) {
    case "VALOR_FECHADOS":
      return { tipo_meta: "VALOR", origem_resultado: "ESTAGIO_GANHO" };
    case "VOLUME_FECHADOS":
      return { tipo_meta: "VOLUME", origem_resultado: "ESTAGIO_GANHO" };
    default:
      return { tipo_meta: "VALOR", origem_resultado: "PAGAMENTOS" };
  }
}

function formularioDaMeta(meta: MetaModuleItem): MetaFormState {
  return {
    titulo: meta.titulo,
    periodo: meta.periodo,
    medicao: medicaoDaMeta(meta),
    alvo: String(meta.alvo),
    data_inicio: meta.data_inicio.slice(0, 10),
    data_fim: meta.data_fim.slice(0, 10),
    id_pdv: meta.id_pdv ?? "",
  };
}

function cadenciaPorPeriodo(periodo: PeriodoMeta): MetaPayloadApi["cadencia"] {
  switch (periodo) {
    case "MENSAIS":
      return "MENSAL";
    case "TRIMESTRAL":
      return "TRIMESTRAL";
    case "ANUAL":
      return "ANUAL";
    case "PERSONALIZADO":
      return "PERSONALIZADO";
    default:
      return "SEMANAL_MES";
  }
}

function montarPayload(formulario: MetaFormState): MetaPayloadApi {
  const configuracaoMedicao = definirMedicao(formulario.medicao);
  return {
    titulo: formulario.titulo,
    tipo: "PDV",
    tipo_meta: configuracaoMedicao.tipo_meta,
    origem_resultado: configuracaoMedicao.origem_resultado,
    cadencia: cadenciaPorPeriodo(formulario.periodo),
    recorrencia: "PONTUAL",
    alvo: Number(formulario.alvo),
    periodo: formulario.periodo,
    data_inicio: new Date(`${formulario.data_inicio}T00:00:00`).toISOString(),
    data_fim: new Date(`${formulario.data_fim}T23:59:59`).toISOString(),
    id_pdv: formulario.id_pdv,
  };
}

export function useMetasModule({ perfil, id_pdv, modo }: UseMetasModuleProps): UseMetasModuleReturn {
  const { addToast } = useToast();
  const [metas, setMetas] = useState<MetaModuleItem[]>([]);
  const [ranking, setRanking] = useState<UseMetasModuleReturn["ranking"]>([]);
  const [mediaEquipe, setMediaEquipe] = useState(0);
  const [totalParticipantes, setTotalParticipantes] = useState(0);
  const [opcoesPdvs, setOpcoesPdvs] = useState<MetaOptionPdv[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [desativandoId, setDesativandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogFormAberto, setDialogFormAberto] = useState(false);
  const [metaEmEdicao, setMetaEmEdicao] = useState<MetaModuleItem | null>(null);
  const [pdvSelecionado, setPdvSelecionado] = useState<string | null>(id_pdv ?? null);

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

    const proximosPdvs = pdvsFiltrados.map((pdv) => ({ id: pdv.id, nome: pdv.nome }));
    setOpcoesPdvs(proximosPdvs);

    if (perfil !== "EMPRESA" && proximosPdvs[0]?.id) {
      setPdvSelecionado(proximosPdvs[0].id);
    }

    return { erro: null };
  }, [id_pdv, perfil]);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const rankingQuery = id_pdv && perfil !== "EMPRESA" ? `id_pdv=${id_pdv}` : "";

    try {
      const [opcoesResultado, metasResultado, rankingResultado] = await Promise.all([
        carregarOpcoes(),
        listarMetas(id_pdv && perfil !== "EMPRESA" ? `id_pdv=${id_pdv}&ativo=true` : "ativo=true"),
        obterRankingMetas(rankingQuery),
      ]);

      if (opcoesResultado.erro) {
        setErro(opcoesResultado.erro);
      }

      if (!metasResultado.ok) {
        setErro(metasResultado.erro);
        setMetas([]);
      } else {
        setMetas(metasResultado.dados.metas);
      }

      if (!rankingResultado.ok) {
        setRanking([]);
        setMediaEquipe(0);
        setTotalParticipantes(0);
        setErro((atual) => atual ?? rankingResultado.erro);
      } else {
        setRanking(rankingResultado.dados.ranking);
        setMediaEquipe(rankingResultado.dados.media_equipe);
        setTotalParticipantes(rankingResultado.dados.total_participantes);
      }
    } finally {
      setCarregando(false);
    }
  }, [carregarOpcoes, id_pdv, perfil]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const metasFiltradas = useMemo(() => {
    if (!pdvSelecionado) return metas;
    return metas.filter((meta) => meta.id_pdv === pdvSelecionado);
  }, [metas, pdvSelecionado]);

  const metasAgrupadas = useMemo(() => {
    const grupos = new Map<string, { id: string; nome: string; metas: MetaModuleItem[] }>();

    for (const meta of metasFiltradas) {
      const id = meta.id_pdv ?? meta.id;
      const nome = meta.pdv?.nome ?? "Equipe";

      if (!grupos.has(id)) {
        grupos.set(id, { id, nome, metas: [] });
      }

      grupos.get(id)?.metas.push(meta);
    }

    return Array.from(grupos.values()).map((grupo) => ({
      ...grupo,
      metas: [...grupo.metas].sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime()),
    }));
  }, [metasFiltradas]);

  const resumo = useMemo(() => {
    const totais = metasFiltradas.reduce(
      (acc, meta) => {
        const percentual = meta.progresso?.percentual ?? 0;
        if (percentual >= 80) acc.equipesNoRitmo += 1;
        else if (percentual >= 45) acc.equipesEmAtencao += 1;
        else acc.equipesForaDoRitmo += 1;
        acc.somaPercentual += percentual;
        return acc;
      },
      {
        equipesNoRitmo: 0,
        equipesEmAtencao: 0,
        equipesForaDoRitmo: 0,
        somaPercentual: 0,
      },
    );

    const totalEquipes = metasFiltradas.length;
    return {
      totalEquipes,
      equipesNoRitmo: totais.equipesNoRitmo,
      equipesEmAtencao: totais.equipesEmAtencao,
      equipesForaDoRitmo: totais.equipesForaDoRitmo,
      mediaPercentual: totalEquipes > 0 ? Number((totais.somaPercentual / totalEquipes).toFixed(1)) : 0,
    };
  }, [metasFiltradas]);

  const abrirNovaMeta = useCallback(() => {
    setMetaEmEdicao(null);
    setDialogFormAberto(true);
  }, []);

  const abrirEdicao = useCallback((meta: MetaModuleItem) => {
    setMetaEmEdicao(meta);
    setDialogFormAberto(true);
  }, []);

  const fecharDialog = useCallback(() => {
    setDialogFormAberto(false);
    setMetaEmEdicao(null);
  }, []);

  const salvarMeta = useCallback(async (formulario: MetaFormState) => {
    const payload = montarPayload(formulario);
    if (!Number.isFinite(payload.alvo) || payload.alvo <= 0) {
      setErro("Informe um alvo valido para a meta.");
      return false;
    }

    setSalvando(true);
    setErro(null);

    try {
      const resposta = metaEmEdicao
        ? await editarMetaApi(metaEmEdicao.id, payload)
        : await criarMetaApi(payload);

      if (!resposta.ok) {
        setErro(resposta.erro);
        addToast({
          type: "error",
          title: "Nao foi possivel salvar a meta",
          description: resposta.erro,
          duration: 4500,
        });
        return false;
      }

      addToast({
        type: "success",
        title: metaEmEdicao ? "Meta atualizada" : "Meta criada",
        description: metaEmEdicao
          ? "A equipe ja aparece com os dados atualizados no painel."
          : "A nova meta ja esta pronta para acompanhar.",
        duration: 4000,
      });

      fecharDialog();
      await carregarDados();
      return true;
    } finally {
      setSalvando(false);
    }
  }, [addToast, carregarDados, fecharDialog, metaEmEdicao]);

  const desativarMeta = useCallback(async (id: string) => {
    setDesativandoId(id);
    setErro(null);

    try {
      const resposta = await desativarMetaApi(id);
      if (!resposta.ok) {
        setErro(resposta.erro);
        addToast({
          type: "error",
          title: "Nao foi possivel arquivar a meta",
          description: resposta.erro,
          duration: 4500,
        });
        return false;
      }

      addToast({
        type: "success",
        title: "Meta arquivada",
        description: "A meta saiu da semana atual sem apagar o historico.",
        duration: 3500,
      });
      await carregarDados();
      return true;
    } finally {
      setDesativandoId(null);
    }
  }, [addToast, carregarDados]);

  return {
    modo,
    perfil,
    metas,
    metasFiltradas,
    metasAgrupadas,
    ranking,
    mediaEquipe,
    totalParticipantes,
    opcoesPdvs,
    carregando,
    salvando,
    desativandoId,
    erro,
    dialogFormAberto,
    metaEmEdicao,
    pdvSelecionado,
    podeCriarMeta,
    resumo,
    setPdvSelecionado,
    abrirNovaMeta,
    abrirEdicao,
    fecharDialog,
    salvarMeta,
    desativarMeta,
    recarregar: carregarDados,
  };
}

export { criarFormularioInicial, formularioDaMeta };
export { MEDICOES_META };
