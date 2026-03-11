import { useMemo, useState } from "react";
import { calcularPendenciasLead } from "@/lib/calculo-pendencias";
import type {
  Estagio,
  KanbanFilters,
  Lead,
  OrdenacaoKanban,
  PendenciaLeadInfo,
} from "../types";
import { getGravidadePendencia } from "./use-pendencias-globais";

function leadPassaFiltros(
  pendenciaInfo: PendenciaLeadInfo | undefined,
  filtros: KanbanFilters,
): boolean {
  if (filtros.status === "com_pendencia" && !pendenciaInfo) return false;
  if (filtros.status === "sem_pendencia" && pendenciaInfo) return false;

  if (filtros.gravidade !== "todas" && pendenciaInfo) {
    if (pendenciaInfo.gravidadeMaxima !== filtros.gravidade) return false;
  }

  if (filtros.tipo !== "todos" && pendenciaInfo) {
    if (!pendenciaInfo.tipos.includes(filtros.tipo)) return false;
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
  });
  const [modoFocoPendencias, setModoFocoPendencias] = useState(false);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<OrdenacaoKanban>("recente");

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
      ? { status: "com_pendencia" as const, gravidade: "todas" as const, tipo: "todos" as const, pdv: filtros.pdv }
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
      if (!leadPassaFiltros(pendenciaInfo, filtrosAtivos)) continue;

      if (busca) {
        const buscaLower = busca.toLowerCase();
        const matchesNome = lead.nome.toLowerCase().includes(buscaLower);
        const matchesTelefone = lead.telefone.includes(busca);
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
            return a.nome.localeCompare(b.nome);
          default:
            return 0;
        }
      });
    }

    return mapa;
  }, [estagios, leads, pendenciasPorLead, filtros, modoFocoPendencias, busca, ordenacao]);

  const estagioAberto = useMemo(
    () => estagios.find((estagio) => estagio.tipo === "ABERTO")?.id ?? estagios[0]?.id ?? "",
    [estagios],
  );

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
    estagioAberto,
  };
}
