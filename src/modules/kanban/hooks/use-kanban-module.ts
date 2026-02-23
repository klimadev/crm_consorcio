"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { DropResult } from "@hello-pangea/dnd";
import {
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
  converteMoedaBrParaNumero,
} from "@/lib/utils";
import type { Estagio, Lead, Funcionario, PendenciaLead, UseKanbanModuleReturn, Props } from "../types";

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

  const [todasPendencias, setTodasPendencias] = useState<PendenciaLead[]>([]);
  const [pendenciasLead, setPendenciasLead] = useState<PendenciaLead[]>([]);

  const bootstrap = useCallback(async () => {
    const [resLeads, resPendencias] = await Promise.all([
      fetch("/api/leads"),
      fetch("/api/pendencias"),
    ]);

    if (resLeads.ok) {
      const json = await resLeads.json();
      setEstagios(json.estagios ?? []);
      setLeads(json.leads ?? []);
      setFuncionarios(json.funcionarios ?? []);
    }

    if (resPendencias.ok) {
      const json = await resPendencias.json();
      setTodasPendencias(json.pendencias ?? []);
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

  const pendenciasPorLead = useMemo(() => {
    const mapa: Record<string, { total: number; naoResolvidas: number }> = {};
    for (const pendencia of todasPendencias) {
      if (!mapa[pendencia.id_lead]) {
        mapa[pendencia.id_lead] = { total: 0, naoResolvidas: 0 };
      }
      mapa[pendencia.id_lead].total++;
      if (!pendencia.resolvida) {
        mapa[pendencia.id_lead].naoResolvidas++;
      }
    }
    return mapa;
  }, [todasPendencias]);

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

  const resolverPendenciaDocumentoAprovacao = useCallback(async (idLead: string) => {
    try {
      const resPendencias = await fetch(`/api/pendencias/lead/${idLead}`);
      if (resPendencias.ok) {
        const json = await resPendencias.json();
        const pendencias = json.pendencias ?? [];

        const pendenciaDocAprovacao = pendencias.find(
          (p: PendenciaLead) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE" && !p.resolvida,
        );

        if (pendenciaDocAprovacao) {
          await fetch(`/api/pendencias/${pendenciaDocAprovacao.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resolvida: true }),
          });

          const [resLead, resTodas] = await Promise.all([
            fetch(`/api/pendencias/lead/${idLead}`),
            fetch("/api/pendencias"),
          ]);

          if (resLead.ok) {
            const jsonP = await resLead.json();
            setPendenciasLead(jsonP.pendencias ?? []);
          }
          if (resTodas.ok) {
            const jsonTodas = await resTodas.json();
            setTodasPendencias(jsonTodas.pendencias ?? []);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao resolver pendência automaticamente:", error);
    }
  }, []);

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

          if (docUrl) {
            await resolverPendenciaDocumentoAprovacao(leadAtualizado.id);
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
    [documentoAprovacaoUrl, arquivoSelecionado, handleUploadArquivo, resolverPendenciaDocumentoAprovacao],
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

  const togglePendenciaResolvida = useCallback(async (pendencia: PendenciaLead) => {
    const resposta = await fetch(`/api/pendencias/${pendencia.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolvida: !pendencia.resolvida }),
    });

    if (resposta.ok && leadSelecionado) {
      const resPendencias = await fetch(`/api/pendencias/lead/${leadSelecionado.id}`);
      if (resPendencias.ok) {
        const json = await resPendencias.json();
        setPendenciasLead(json.pendencias ?? []);

        const resTodas = await fetch("/api/pendencias");
        if (resTodas.ok) {
          const jsonTodas = await resTodas.json();
          setTodasPendencias(jsonTodas.pendencias ?? []);
        }
      }
    }
  }, [leadSelecionado]);

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
    pendenciasPorLead,
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
    setLeadSelecionado,
    criarLead,
    confirmarPerda,
    aoDragEnd,
    aoMudarLead,
    togglePendenciaResolvida,
    excluirLead,
    estagioAberto,
    cargoNovoLead,
    setCargoNovoLead,
    setEstagioNovoLead,
    estagioNovoLead,
  };
}
