"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { DropResult } from "@hello-pangea/dnd";
import {
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
  converteMoedaBrParaNumero,
} from "@/lib/utils";
import { DIAS_ESTAGIO_PARADO, LABELS_PENDENCIA, TipoPendencia } from "@/lib/validacoes";
import type { Estagio, Lead, Funcionario, PendenciaDinamica, UseKanbanModuleReturn, Props, KanbanFilters, PendenciaLeadInfo } from "../types";
import { usePendenciasGlobais, getGravidadePendencia } from "./use-pendencias-globais";

type PendenciaCalculada = {
  id: string;
  id_lead: string;
  tipo: TipoPendencia;
  descricao: string;
  resolvida: boolean;
};

function calcularPendenciasLead(lead: Lead, estagio: Estagio): PendenciaCalculada[] {
  const pendencias: PendenciaCalculada[] = [];
  const hoje = new Date();
  const dataLimiteEstagioParado = new Date(hoje);
  dataLimiteEstagioParado.setDate(dataLimiteEstagioParado.getDate() - DIAS_ESTAGIO_PARADO);

  const isFechadoOuGanho = estagio.tipo === "FECHADO" || estagio.tipo === "GANHO";
  const isGanhoOuPerdido = estagio.tipo === "GANHO" || estagio.tipo === "PERDIDO";
  const hasDocumento = !!lead.documento_aprovacao_url;
  const isEstagioParado = new Date(lead.atualizado_em || Date.now()) < dataLimiteEstagioParado;

  if (isFechadoOuGanho && !hasDocumento) {
    pendencias.push({
      id: `${lead.id}:DOCUMENTO_APROVACAO_PENDENTE`,
      id_lead: lead.id,
      tipo: "DOCUMENTO_APROVACAO_PENDENTE",
      descricao: LABELS_PENDENCIA.DOCUMENTO_APROVACAO_PENDENTE,
      resolvida: false,
    });
  }

  if (!isGanhoOuPerdido && isEstagioParado) {
    pendencias.push({
      id: `${lead.id}:ESTAGIO_PARADO`,
      id_lead: lead.id,
      tipo: "ESTAGIO_PARADO",
      descricao: `Lead parado no estágio "${estagio.nome}" há mais de ${DIAS_ESTAGIO_PARADO} dias.`,
      resolvida: false,
    });
  }

  return pendencias;
}

function leadPassaFiltros(lead: Lead, pendenciaInfo: PendenciaLeadInfo | undefined, filtros: KanbanFilters): boolean {
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

export function useKanbanModule({ perfil, idUsuario }: Props): UseKanbanModuleReturn {
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const [dialogNovoLeadAberto, setDialogNovoLeadAberto] = useState(false);

  const [movimentoPendente, setMovimentoPendente] = useState<{
    id_lead: string;
    id_estagio: string;
  } | null>(null);
  const [motivoPerda, setMotivoPerda] = useState("");

  const [cargoNovoLead, setCargoNovoLead] = useState<{ id_funcionario: string } | null>(null);
  const [estagioNovoLead, setEstagioNovoLead] = useState("");
  const [telefoneNovoLead, setTelefoneNovoLead] = useState("");
  const [valorNovoLead, setValorNovoLead] = useState("");
  const [erroNovoLead, setErroNovoLead] = useState<string | null>(null);
  const [erroDetalhesLead, setErroDetalhesLead] = useState<string | null>(null);
  const [documentoAprovacaoUrl, setDocumentoAprovacaoUrl] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [uploadando, setUploadando] = useState(false);

  const [filtros, setFiltros] = useState<KanbanFilters>({
    status: "todos",
    gravidade: "todas",
    tipo: "todos",
  });
  const [modoFocoPendencias, setModoFocoPendencias] = useState(false);

  const {
    resumo: resumoPendencias,
    recarregar: recarregarPendencias,
    notificacoesAtivadas,
    alternarNotificacoes,
    permissaoNotificacao,
  } = usePendenciasGlobais();

  const bootstrap = useCallback(async () => {
    const resLeads = await fetch("/api/leads");
    if (resLeads.ok) {
      const json = await resLeads.json();
      setEstagios(json.estagios ?? []);
      setLeads(json.leads ?? []);
      setFuncionarios(json.funcionarios ?? []);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    const carregarInicial = async () => {
      await bootstrap();
    };
    void carregarInicial();
    return () => {
      ativo = false;
    };
  }, [bootstrap]);

  const pendenciasPorLead = useMemo((): Record<string, PendenciaLeadInfo> => {
    const mapa: Record<string, PendenciaLeadInfo> = {};
    const mapaEstagios = Object.fromEntries(estagios.map(e => [e.id, e]));
    
    for (const lead of leads) {
      const estagio = mapaEstagios[lead.id_estagio];
      if (!estagio) continue;
      
      const pendencias = calcularPendenciasLead(lead, estagio);
      if (pendencias.length > 0) {
        const tipos = pendencias.map(p => p.tipo);
        let gravidadeMaxima: "info" | "alerta" | "critica" = "info";
        for (const tipo of tipos) {
          const g = getGravidadePendencia(tipo);
          const ordem = { info: 0, alerta: 1, critica: 2 };
          if (ordem[g] > ordem[gravidadeMaxima]) {
            gravidadeMaxima = g;
          }
        }
        mapa[lead.id] = {
          total: pendencias.length,
          naoResolvidas: pendencias.filter(p => !p.resolvida).length,
          tipos,
          gravidadeMaxima,
        };
      }
    }
    return mapa;
  }, [leads, estagios]);

  const pendenciasLead = useMemo(() => {
    if (!leadSelecionado) return [];
    const estagio = estagios.find(e => e.id === leadSelecionado.id_estagio);
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
      ? { status: "com_pendencia" as const, gravidade: "todas" as const, tipo: "todos" as const }
      : filtros;
    
    const mapa: Record<string, Lead[]> = {};
    for (const estagio of estagios) {
      mapa[estagio.id] = [];
    }
    for (const lead of leads) {
      if (mapa[lead.id_estagio]) {
        const pendenciaInfo = pendenciasPorLead[lead.id];
        if (leadPassaFiltros(lead, pendenciaInfo, filtrosAtivos)) {
          mapa[lead.id_estagio].push(lead);
        }
      }
    }
    return mapa;
  }, [estagios, leads, pendenciasPorLead, filtros, modoFocoPendencias]);

  const estagioAberto = useMemo(
    () => estagios.find((e) => e.tipo === "ABERTO")?.id ?? estagios[0]?.id ?? "",
    [estagios],
  );

  const moverLead = useCallback(
    async (idLead: string, idEstagio: string, motivo?: string) => {
      const leadAnterior = leads.find((item) => item.id === idLead);
      if (!leadAnterior) return false;

      setLeads((atual) =>
        atual.map((item) =>
          item.id === idLead
            ? {
                ...item,
                id_estagio: idEstagio,
                motivo_perda: motivo?.trim() ? motivo.trim() : null,
              }
            : item,
        ),
      );

      const resposta = await fetch(`/api/leads/${idLead}/mover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_estagio: idEstagio, motivo_perda: motivo }),
      });

      if (!resposta.ok) {
        setLeads((atual) =>
          atual.map((item) => (item.id === idLead ? leadAnterior : item)),
        );
        return false;
      }

      const json = (await resposta.json()) as { lead?: Lead };
      if (json.lead) {
        const leadAtualizado = json.lead;
        setLeads((atual) => atual.map((item) => (item.id === idLead ? leadAtualizado : item)));
      }

      return true;
    },
    [leads],
  );

  const aoDragEnd = useCallback(
    async (resultado: DropResult) => {
      if (!resultado.destination) return;

      const idLead = resultado.draggableId;
      const idEstagioDestino = resultado.destination.droppableId;

      const lead = leads.find((item) => item.id === idLead);
      if (!lead || lead.id_estagio === idEstagioDestino) return;

      const estagioDestino = estagios.find((item) => item.id === idEstagioDestino);
      if (!estagioDestino) return;

      if (estagioDestino.tipo === "PERDIDO") {
        setMovimentoPendente({ id_lead: idLead, id_estagio: idEstagioDestino });
        return;
      }

      await moverLead(idLead, idEstagioDestino);
    },
    [leads, estagios, moverLead],
  );

  const confirmarPerda = useCallback(
    async (evento: React.FormEvent<HTMLFormElement>) => {
      evento.preventDefault();
      if (!movimentoPendente || !motivoPerda.trim()) return;
      const sucesso = await moverLead(
        movimentoPendente.id_lead,
        movimentoPendente.id_estagio,
        motivoPerda.trim(),
      );
      if (!sucesso) return;
      setMovimentoPendente(null);
      setMotivoPerda("");
    },
    [movimentoPendente, motivoPerda, moverLead],
  );

  const handleUploadArquivo = useCallback(async (): Promise<string | null> => {
    if (!arquivoSelecionado) return null;

    setUploadando(true);
    const formData = new FormData();
    formData.append("arquivo", arquivoSelecionado);

    try {
      const resposta = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!resposta.ok) {
        const json = await resposta.json();
        setErroDetalhesLead(json.erro ?? "Erro ao fazer upload.");
        return null;
      }

      const json = await resposta.json();
      return json.url;
    } catch {
      setErroDetalhesLead("Erro ao fazer upload.");
      return null;
    } finally {
      setUploadando(false);
    }
  }, [arquivoSelecionado]);

  const salvarDetalhesLead = useCallback(
    async (lead: Lead, urlDocumento?: string, opcoes?: { atualizarSelecionado?: boolean }) => {
      const atualizarSelecionado = opcoes?.atualizarSelecionado ?? true;
      setSalvando(true);
      setSalvo(false);
      setErroDetalhesLead(null);

      try {
        let docUrl = urlDocumento ?? documentoAprovacaoUrl.trim();

        if (arquivoSelecionado) {
          const urlUpload = await handleUploadArquivo();
          if (!urlUpload) {
            setSalvando(false);
            return;
          }
          docUrl = urlUpload;
          setArquivoSelecionado(null);
        }

        const resposta = await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            observacoes: lead.observacoes,
            telefone: lead.telefone,
            valor_consorcio: Number(lead.valor_consorcio),
            documento_aprovacao_url: docUrl || null,
          }),
        });

        if (!resposta.ok) {
          const json = await resposta.json();
          setErroDetalhesLead(json.erro ?? "Erro ao salvar lead.");
          setSalvando(false);
          return;
        }

        const json = (await resposta.json()) as { lead?: Lead };
        if (json.lead) {
          const leadAtualizado = json.lead;
          setLeads((atual) => atual.map((item) => (item.id === leadAtualizado.id ? leadAtualizado : item)));
          if (atualizarSelecionado) {
            setLeadSelecionado((atual) =>
              atual && atual.id === leadAtualizado.id ? leadAtualizado : atual,
            );
          }
        }

        setSalvando(false);
        setSalvo(true);

        setTimeout(() => setSalvo(false), 2000);
      } catch {
        setErroDetalhesLead("Erro ao salvar lead.");
        setSalvando(false);
      }
    },
    [documentoAprovacaoUrl, arquivoSelecionado, handleUploadArquivo],
  );

  const aoMudarLead = useCallback(
    (leadAtualizado: Lead) => {
      setLeadSelecionado(leadAtualizado);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        salvarDetalhesLead(leadAtualizado);
      }, 1000);
    },
    [salvarDetalhesLead],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (leadSelecionado && documentoAprovacaoUrl !== (leadSelecionado.documento_aprovacao_url ?? "")) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        salvarDetalhesLead(leadSelecionado, documentoAprovacaoUrl);
      }, 1000);
    }
  }, [documentoAprovacaoUrl, leadSelecionado, salvarDetalhesLead]);

  const criarLead = useCallback(
    async (evento: React.FormEvent<HTMLFormElement>) => {
      evento.preventDefault();
      setErroNovoLead(null);
      const dados = new FormData(evento.currentTarget);
      const nome = String(dados.get("nome") ?? "").trim();
      const id_estagio = String(dados.get("id_estagio") ?? "");

      const id_funcionario =
        perfil === "COLABORADOR"
          ? idUsuario
          : cargoNovoLead?.id_funcionario ?? String(dados.get("id_funcionario") ?? "");

      const telefone = telefoneNovoLead;
      const valor_consorcio = converteMoedaBrParaNumero(valorNovoLead);

      const idTemporario = `temp-${Date.now()}`;
      const leadTemporario: Lead = {
        id: idTemporario,
        id_estagio,
        id_funcionario,
        nome,
        telefone,
        valor_consorcio,
        observacoes: null,
        motivo_perda: null,
        documento_aprovacao_url: null,
        atualizado_em: new Date().toISOString(),
      };

      setLeads((atual) => [leadTemporario, ...atual]);

      const resposta = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          telefone,
          valor_consorcio,
          id_estagio,
          id_funcionario,
        }),
      });

      if (!resposta.ok) {
        const json = await resposta.json();
        setErroNovoLead(json.erro ?? "Erro ao criar lead.");
        setLeads((atual) => atual.filter((item) => item.id !== idTemporario));
        return;
      }

      const json = (await resposta.json()) as { lead?: Lead };

      if (json.lead) {
        const leadCriado = json.lead;
        setLeads((atual) =>
          atual.map((item) => (item.id === idTemporario ? leadCriado : item)),
        );
      } else {
        setLeads((atual) => atual.filter((item) => item.id !== idTemporario));
      }

      evento.currentTarget.reset();
      setEstagioNovoLead("");
      setCargoNovoLead(null);
      setTelefoneNovoLead("");
      setValorNovoLead("");
      setDialogNovoLeadAberto(false);
    },
    [perfil, idUsuario, cargoNovoLead, telefoneNovoLead, valorNovoLead],
  );

  const excluirLead = useCallback(async (id: string) => {
    const resposta = await fetch(`/api/leads/${id}`, {
      method: "DELETE",
    });

    if (resposta.ok) {
      setLeads((atual) => atual.filter((item) => item.id !== id));
      setLeadSelecionado(null);
    } else {
      const json = await resposta.json();
      setErroDetalhesLead(json.erro ?? "Erro ao excluir lead.");
    }
  }, []);

  useEffect(() => {
    if (leadSelecionado) {
      setDocumentoAprovacaoUrl(leadSelecionado.documento_aprovacao_url ?? "");
    }
  }, [leadSelecionado?.id]);

  return {
    estagios,
    leads,
    funcionarios,
    leadsPorEstagio,
    leadsFiltradosPorEstagio,
    pendenciasPorLead,
    todasPendencias: [],
    resumoPendencias,
    leadSelecionado,
    pendenciasLead,
    dialogNovoLeadAberto,
    setDialogNovoLeadAberto,
    movimentoPendente,
    setMovimentoPendente,
    motivoPerda,
    setMotivoPerda,
    telefoneNovoLead,
    setTelefoneNovoLead,
    valorNovoLead,
    setValorNovoLead,
    erroNovoLead,
    setErroNovoLead,
    documentoAprovacaoUrl,
    setDocumentoAprovacaoUrl,
    arquivoSelecionado,
    setArquivoSelecionado,
    uploadando,
    salvando,
    salvo,
    erroDetalhesLead,
    setErroDetalhesLead,
    salvarDetalhesLead,
    setLeadSelecionado,
    criarLead,
    confirmarPerda,
    aoDragEnd,
    aoMudarLead,
    excluirLead,
    estagioAberto,
    cargoNovoLead,
    setCargoNovoLead,
    setEstagioNovoLead,
    estagioNovoLead,
    filtros,
    setFiltros,
    modoFocoPendencias,
    setModoFocoPendencias,
    recarregarPendencias,
    notificacoesAtivadas,
    alternarNotificacoes,
    permissaoNotificacao,
  };
}
