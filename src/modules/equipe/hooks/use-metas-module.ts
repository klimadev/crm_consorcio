"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { listarPdvs } from "@/lib/api/equipe";
import {
  criarMeta as criarMetaApi,
  desativarMeta as desativarMetaApi,
  editarMeta as editarMetaApi,
  listarMetas,
  obterProgressoMeta,
  obterRankingMetas,
  validarTetoMeta as validarTetoMetaApi,
  type MetaPayloadApi,
} from "@/lib/api/metas";
import type {
  MetaFormState,
  MetaModuleItem,
  MetaOptionColaborador,
  MetaOptionPdv,
  UseMetasModuleProps,
  UseMetasModuleReturn,
} from "../types/metas";

function hojeInput() {
  return new Date().toISOString().slice(0, 10);
}

function ultimoDiaMesAtualInput() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function criarFormularioInicial(tipo: MetaFormState["tipo"] = "GLOBAL"): MetaFormState {
  return {
    tipo,
    tipo_meta: "VALOR",
    alvo: "",
    periodo: "MENSAIS",
    data_inicio: hojeInput(),
    data_fim: ultimoDiaMesAtualInput(),
    id_pdv: "",
    id_funcionario: "",
  };
}

function formularioDaMeta(meta: MetaModuleItem): MetaFormState {
  return {
    tipo: meta.tipo,
    tipo_meta: meta.tipo_meta,
    alvo: String(meta.alvo),
    periodo: meta.periodo,
    data_inicio: meta.data_inicio.slice(0, 10),
    data_fim: meta.data_fim.slice(0, 10),
    id_pdv: meta.id_pdv ?? "",
    id_funcionario: meta.id_funcionario ?? "",
  };
}

function montarPayload(formulario: MetaFormState): MetaPayloadApi {
  return {
    tipo: formulario.tipo,
    tipo_meta: formulario.tipo_meta,
    alvo: Number(formulario.alvo),
    periodo: formulario.periodo,
    data_inicio: new Date(`${formulario.data_inicio}T00:00:00`).toISOString(),
    data_fim: new Date(`${formulario.data_fim}T23:59:59`).toISOString(),
    ...(formulario.tipo === "PDV" && formulario.id_pdv ? { id_pdv: formulario.id_pdv } : {}),
    ...(formulario.tipo === "INDIVIDUAL" && formulario.id_funcionario
      ? { id_funcionario: formulario.id_funcionario }
      : {}),
  };
}

export function useMetasModule({ perfil, id_pdv, id_usuario, modo }: UseMetasModuleProps): UseMetasModuleReturn {
  const { addToast } = useToast();
  const [metas, setMetas] = useState<MetaModuleItem[]>([]);
  const [minhaMeta, setMinhaMeta] = useState<MetaModuleItem | null>(null);
  const [progresso, setProgresso] = useState<UseMetasModuleReturn["progresso"]>(null);
  const [ranking, setRanking] = useState<UseMetasModuleReturn["ranking"]>([]);
  const [mediaEquipe, setMediaEquipe] = useState(0);
  const [totalParticipantes, setTotalParticipantes] = useState(0);
  const [tetos, setTetos] = useState<UseMetasModuleReturn["tetos"]>({ globais: [], pdvs: [] });
  const [opcoesPdvs, setOpcoesPdvs] = useState<MetaOptionPdv[]>([]);
  const [opcoesColaboradores, setOpcoesColaboradores] = useState<MetaOptionColaborador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [desativandoId, setDesativandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogFormAberto, setDialogFormAberto] = useState(false);
  const [metaEmEdicao, setMetaEmEdicao] = useState<MetaModuleItem | null>(null);
  const [tipoCriacao, setTipoCriacao] = useState<MetaFormState["tipo"]>(perfil === "EMPRESA" ? "GLOBAL" : "PDV");
  const [abaAtiva, setAbaAtiva] = useState<MetaFormState["tipo"]>(perfil === "EMPRESA" ? "GLOBAL" : "PDV");

  const podeCriarGlobal = perfil === "EMPRESA";
  const podeCriarMetaPdv = perfil === "EMPRESA" || perfil === "GERENTE";
  const podeCriarMetaIndividual = perfil === "EMPRESA" || perfil === "GERENTE";
  const podeVerValoresAbsolutos = perfil === "EMPRESA" || perfil === "GERENTE" || modo === "colaborador";

  const metasGlobais = useMemo(() => metas.filter((meta) => meta.tipo === "GLOBAL"), [metas]);
  const metasPdv = useMemo(() => metas.filter((meta) => meta.tipo === "PDV"), [metas]);
  const metasIndividuais = useMemo(() => metas.filter((meta) => meta.tipo === "INDIVIDUAL"), [metas]);

  const carregarOpcoes = useCallback(async () => {
    const resposta = await listarPdvs();
    if (!resposta.ok) {
      return { erro: resposta.erro };
    }

    const pdvsFiltrados = resposta.dados.pdvs.filter((pdv) => {
      if (!id_pdv) return true;
      if (perfil === "EMPRESA") return true;
      return pdv.id === id_pdv;
    });

    const proximosPdvs = pdvsFiltrados.map((pdv) => ({ id: pdv.id, nome: pdv.nome }));
    const proximosColaboradores = pdvsFiltrados
      .flatMap((pdv) =>
        (pdv.funcionarios ?? [])
          .filter((funcionario) => funcionario.cargo === "COLABORADOR")
          .map((funcionario) => ({
            id: funcionario.id,
            nome: funcionario.nome,
            id_pdv: pdv.id,
            nome_pdv: pdv.nome,
          })),
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    setOpcoesPdvs(proximosPdvs);
    setOpcoesColaboradores(proximosColaboradores);
    return { erro: null };
  }, [id_pdv, perfil]);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const rankingQuery = id_pdv && perfil !== "EMPRESA" ? `id_pdv=${id_pdv}` : "";

    try {
      const [opcoesResultado, metasResultado, rankingResultado] = await Promise.all([
        carregarOpcoes(),
        listarMetas(modo === "colaborador" ? `id_funcionario=${id_usuario}&ativo=true` : ""),
        obterRankingMetas(rankingQuery),
      ]);

      if (opcoesResultado.erro) {
        setErro(opcoesResultado.erro);
      }

      if (!metasResultado.ok) {
        setErro(metasResultado.erro);
        setMetas([]);
        setMinhaMeta(null);
        setProgresso(null);
      } else if (modo === "colaborador") {
        const metaPessoal = metasResultado.dados.metas[0] ?? null;
        setMetas(metaPessoal ? [metaPessoal] : []);
        setMinhaMeta(metaPessoal);
        setTetos({ globais: [], pdvs: [] });

        if (metaPessoal?.progresso) {
          setProgresso(metaPessoal.progresso);
        } else if (metaPessoal) {
          const progressoResultado = await obterProgressoMeta(metaPessoal.id);
          setProgresso(progressoResultado.ok ? progressoResultado.dados : null);
          if (!progressoResultado.ok) {
            setErro(progressoResultado.erro);
          }
        } else {
          setProgresso(null);
        }
      } else {
        setMetas(metasResultado.dados.metas);
        setTetos(metasResultado.dados.tetos);
        setMinhaMeta(null);
        setProgresso(null);
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
  }, [carregarOpcoes, id_pdv, id_usuario, modo, perfil]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const abrirNovaMeta = useCallback((tipo: MetaFormState["tipo"] = tipoCriacao) => {
    setMetaEmEdicao(null);
    setTipoCriacao(tipo);
    setDialogFormAberto(true);
  }, [tipoCriacao]);

  const abrirEdicao = useCallback((meta: MetaModuleItem) => {
    setMetaEmEdicao(meta);
    setTipoCriacao(meta.tipo);
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
      const validacaoTeto = await validarTetoMetaApi({
        ...payload,
        ...(metaEmEdicao ? { id_meta_atual: metaEmEdicao.id } : {}),
      });

      if (!validacaoTeto.ok) {
        setErro(validacaoTeto.erro);
        addToast({
          type: "error",
          title: "Nao foi possivel salvar a meta",
          description: validacaoTeto.erro,
          duration: 4500,
        });
        return false;
      }

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
          ? "As alteracoes ja aparecem no painel de acompanhamento."
          : "A nova meta ja esta disponivel para acompanhamento.",
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
          title: "Nao foi possivel desativar a meta",
          description: resposta.erro,
          duration: 4500,
        });
        return false;
      }

      addToast({
        type: "success",
        title: "Meta desativada",
        description: "A meta saiu do acompanhamento ativo sem apagar o historico.",
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
    metas,
    metasGlobais,
    metasPdv,
    metasIndividuais,
    minhaMeta,
    progresso,
    ranking,
    mediaEquipe,
    totalParticipantes,
    tetos,
    opcoesPdvs,
    opcoesColaboradores,
    carregando,
    salvando,
    desativandoId,
    erro,
    dialogFormAberto,
    metaEmEdicao,
    tipoCriacao,
    abaAtiva,
    podeCriarGlobal,
    podeCriarMetaPdv,
    podeCriarMetaIndividual,
    podeVerValoresAbsolutos,
    setAbaAtiva,
    abrirNovaMeta,
    abrirEdicao,
    fecharDialog,
    salvarMeta,
    desativarMeta,
    recarregar: carregarDados,
  };
}

export { criarFormularioInicial, formularioDaMeta };
