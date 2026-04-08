import { useMemo, useState } from "react";
import { calcularPendenciasLead } from "@/lib/calculo-pendencias";
import type {
  Estagio,
  KanbanFilters,
  Lead,
  OrdenacaoKanban,
  PendenciaLeadInfo,
  OrigemStats,
  ResumoEstagioKanban,
  ResumoOperacionalKanban,
} from "../types";
import { getGravidadePendencia } from "./use-pendencias-globais";

function leadPassaFiltros(
  pendenciaInfo: PendenciaLeadInfo | undefined,
  filtros: KanbanFilters,
  lead: Lead,
): boolean {
  if (filtros.status === "com_pendencia" && !pendenciaInfo) return false;
  if (filtros.status === "sem_pendencia" && pendenciaInfo) return false;

  if (filtros.gravidade !== "todas" && pendenciaInfo) {
    if (pendenciaInfo.gravidadeMaxima !== filtros.gravidade) return false;
  }

  if (filtros.tipo !== "todos" && pendenciaInfo) {
    if (!pendenciaInfo.tipos.includes(filtros.tipo)) return false;
  }

  // Filter by origin
  if (filtros.origem !== "todos") {
    const leadOrigem = lead.origem ?? "MANUAL";
    const matchesOrigem =
      (filtros.origem === "ANUNCIO_CTWA" && leadOrigem === "ANUNCIO_CTWA") ||
      (filtros.origem === "SINCRONIZACAO_WHATSAPP" && leadOrigem === "SINCRONIZACAO_WHATSAPP") ||
      (filtros.origem === "MANUAL" && (leadOrigem === "MANUAL" || !lead.origem));
    if (!matchesOrigem) return false;
  }

  return true;
}

type UseKanbanDerivacoesParams = {
  estagios: Estagio[];
  leads: Lead[];
  leadSelecionado: Lead | null;
};

export function useKanbanDerivacoes({
  estagios,
  leads,
  leadSelecionado,
}: UseKanbanDerivacoesParams) {
  const [filtros, setFiltros] = useState<KanbanFilters>({
    status: "todos",
    gravidade: "todas",
    tipo: "todos",
    pdv: null,
    origem: "todos",
  });
  const [modoFocoPendencias, setModoFocoPendencias] = useState(false);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<OrdenacaoKanban>("recente");
  const [agoraMs] = useState(() => Date.now());

  const pendenciasPorLead = useMemo((): Record<string, PendenciaLeadInfo> => {
    const mapa: Record<string, PendenciaLeadInfo> = {};
    const mapaEstagios = Object.fromEntries(estagios.map((estagio) => [estagio.id, estagio]));

    for (const lead of leads) {
      const estagio = mapaEstagios[lead.id_estagio];
      if (!estagio) continue;

      const pendencias = calcularPendenciasLead(lead, estagio);
      if (pendencias.length === 0) continue;

      const tipos = pendencias.map((pendencia) => pendencia.tipo);
      let gravidadeMaxima: "info" | "alerta" | "critica" = "info";

      for (const tipo of tipos) {
        const gravidade = getGravidadePendencia(tipo);
        const ordem = { info: 0, alerta: 1, critica: 2 };
        if (ordem[gravidade] > ordem[gravidadeMaxima]) {
          gravidadeMaxima = gravidade;
        }
      }

      mapa[lead.id] = {
        total: pendencias.length,
        naoResolvidas: pendencias.filter((pendencia) => !pendencia.resolvida).length,
        tipos,
        gravidadeMaxima,
      };
    }

    return mapa;
  }, [estagios, leads]);

  const pendenciasLead = useMemo(() => {
    if (!leadSelecionado) return [];
    const estagio = estagios.find((item) => item.id === leadSelecionado.id_estagio);
    if (!estagio) return [];
    return calcularPendenciasLead(leadSelecionado, estagio);
  }, [leadSelecionado, estagios]);

  const leadsPorEstagio = useMemo(() => {
    const mapa: Record<string, Lead[]> = {};
    for (const estagio of estagios) {
      mapa[estagio.id] = [];
    }

    for (const lead of leads) {
      if (mapa[lead.id_estagio]) {
        mapa[lead.id_estagio].push(lead);
      }
    }

    return mapa;
  }, [estagios, leads]);

  const leadsFiltradosPorEstagio = useMemo(() => {
    const filtrosAtivos = modoFocoPendencias
      ? { status: "com_pendencia" as const, gravidade: "todas" as const, tipo: "todos" as const, pdv: filtros.pdv, origem: filtros.origem }
      : filtros;

    const mapa: Record<string, Lead[]> = {};
    for (const estagio of estagios) {
      mapa[estagio.id] = [];
    }

    for (const lead of leads) {
      if (!mapa[lead.id_estagio]) continue;

      // Filter by PDV
      if (filtrosAtivos.pdv && lead.id_pdv !== filtrosAtivos.pdv) continue;

      const pendenciaInfo = pendenciasPorLead[lead.id];
      if (!leadPassaFiltros(pendenciaInfo, filtrosAtivos, lead)) continue;

      if (busca) {
        const buscaLower = busca.toLowerCase();
        const nomeLead = typeof lead.nome === "string" ? lead.nome : "";
        const telefoneLead = typeof lead.telefone === "string" ? lead.telefone : "";
        const matchesNome = nomeLead.toLowerCase().includes(buscaLower);
        const matchesTelefone = telefoneLead.includes(busca);
        if (!matchesNome && !matchesTelefone) continue;
      }

      mapa[lead.id_estagio].push(lead);
    }

    for (const estagioId of Object.keys(mapa)) {
      mapa[estagioId] = [...mapa[estagioId]].sort((a, b) => {
        switch (ordenacao) {
          case "valor_maior":
            return b.valor_consorcio - a.valor_consorcio;
          case "valor_menor":
            return a.valor_consorcio - b.valor_consorcio;
          case "recente":
            return new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime();
          case "antigo":
            return new Date(a.atualizado_em).getTime() - new Date(b.atualizado_em).getTime();
          case "nome":
            return String(a.nome ?? "").localeCompare(String(b.nome ?? ""));
          default:
            return 0;
        }
      });
    }

    return mapa;
  }, [estagios, leads, pendenciasPorLead, filtros, modoFocoPendencias, busca, ordenacao]);

  const leadsVisiveis = useMemo(
    () => estagios.flatMap((estagio) => leadsFiltradosPorEstagio[estagio.id] ?? []),
    [estagios, leadsFiltradosPorEstagio],
  );

  const pendenciasCriticasVisiveis = useMemo(() => {
    let total = 0;

    for (const lead of leadsVisiveis) {
      if (pendenciasPorLead[lead.id]?.gravidadeMaxima === "critica") {
        total += 1;
      }
    }

    return total;
  }, [leadsVisiveis, pendenciasPorLead]);

  const estagioAberto = useMemo(
    () => estagios.find((estagio) => estagio.tipo === "ABERTO")?.id ?? estagios[0]?.id ?? "",
    [estagios],
  );

  // Calculate origin statistics
  const origemStats = useMemo((): OrigemStats => {
    const stats: OrigemStats = {
      total: leadsVisiveis.length,
      anuncios: 0,
      whatsapp: 0,
      manual: 0,
    };

    for (const lead of leadsVisiveis) {
      const origem = lead.origem ?? "MANUAL";
      if (origem === "ANUNCIO_CTWA") {
        stats.anuncios++;
      } else if (origem === "SINCRONIZACAO_WHATSAPP") {
        stats.whatsapp++;
      } else {
        // MANUAL or undefined
        stats.manual++;
      }
    }

    return stats;
  }, [leadsVisiveis]);

  const resumoOperacional = useMemo((): ResumoOperacionalKanban => {
    const estagiosFechados = new Set(
      estagios.filter((estagio) => estagio.tipo === "GANHO" || estagio.tipo === "PERDIDO").map((estagio) => estagio.id),
    );

    let leadsSemResponsavel = 0;
    let leadsParados = 0;
    let valorTotalEmAberto = 0;

    for (const lead of leadsVisiveis) {
      if (!lead.id_funcionario) {
        leadsSemResponsavel++;
      }

      if (!estagiosFechados.has(lead.id_estagio)) {
        valorTotalEmAberto += lead.valor_consorcio;

        const diasParados = Math.floor(
          (agoraMs - new Date(lead.atualizado_em).getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diasParados > 3) {
          leadsParados++;
        }
      }
    }

    return {
      leadsSemResponsavel,
      leadsParados,
      valorTotalEmAberto,
    };
  }, [agoraMs, estagios, leadsVisiveis]);

  const resumoPorEstagio = useMemo((): Record<string, ResumoEstagioKanban> => {
    const mapa: Record<string, ResumoEstagioKanban> = {};

    for (const estagio of estagios) {
      mapa[estagio.id] = {
        quantidade: 0,
        valorTotal: 0,
        parados: 0,
        pendencias: 0,
      };
    }

    for (const lead of leadsVisiveis) {
      const resumo = mapa[lead.id_estagio];
      if (!resumo) continue;

      resumo.quantidade += 1;
      resumo.valorTotal += lead.valor_consorcio;

      const pendenciaInfo = pendenciasPorLead[lead.id];
      if (pendenciaInfo?.naoResolvidas) {
        resumo.pendencias += 1;
      }

      const diasParados = Math.floor(
        (agoraMs - new Date(lead.atualizado_em).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diasParados > 3) {
        resumo.parados += 1;
      }
    }

    return mapa;
  }, [agoraMs, estagios, leadsVisiveis, pendenciasPorLead]);

  return {
    filtros,
    setFiltros,
    modoFocoPendencias,
    setModoFocoPendencias,
    busca,
    setBusca,
    ordenacao,
    setOrdenacao,
    pendenciasPorLead,
    pendenciasLead,
    leadsPorEstagio,
    leadsFiltradosPorEstagio,
    totalLeadsVisiveis: leadsVisiveis.length,
    pendenciasCriticasVisiveis,
    estagioAberto,
    origemStats,
    resumoOperacional,
    resumoPorEstagio,
  };
}
