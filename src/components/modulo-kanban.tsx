"use client";

import { DragDropContext, Draggable, DropResult, Droppable } from "@hello-pangea/dnd";
import { FormEvent, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
  converteMoedaBrParaNumero,
  formataMoeda,
  normalizaTelefoneParaWhatsapp,
} from "@/lib/utils";
import { LABELS_PENDENCIA, TipoPendencia } from "@/lib/validacoes";

type Estagio = { id: string; nome: string; ordem: number; tipo: string };
type Lead = {
  id: string;
  id_estagio: string;
  id_funcionario: string;
  nome: string;
  telefone: string;
  valor_consorcio: number;
  observacoes: string | null;
  motivo_perda: string | null;
  documento_aprovacao_url: string | null;
};
type Funcionario = { id: string; nome: string };
type PendenciaLead = {
  id: string;
  id_lead: string;
  tipo: string;
  descricao: string;
  documento_url: string | null;
  resolvida: boolean;
  resolvida_em: string | null;
};

type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  idUsuario: string;
};

export function ModuloKanban({ perfil, idUsuario }: Props) {
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

  // Estados para auto-save
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para upload de arquivo
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [uploadando, setUploadando] = useState(false);

  // Pendências - carregadas automaticamente
  const [todasPendencias, setTodasPendencias] = useState<PendenciaLead[]>([]);
  const [pendenciasLead, setPendenciasLead] = useState<PendenciaLead[]>([]);

  useEffect(() => {
    let ativo = true;

    const carregarInicial = async () => {
      // Carregar leads e pendências em paralelo
      const [resLeads, resPendencias] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/pendencias"),
      ]);
      
      if (!ativo) return;
      
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
    };

    void carregarInicial();

    return () => {
      ativo = false;
    };
  }, []);

  // Contagem de pendências por lead
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

  async function moverLead(idLead: string, idEstagio: string, motivo?: string) {
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
  }

  async function aoDragEnd(resultado: DropResult) {
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
  }

  async function confirmarPerda(evento: FormEvent<HTMLFormElement>) {
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
  }

  // Auto-save function com debounce
  const salvarDetalhesLead = useCallback(async (
    lead: Lead,
    urlDocumento?: string,
    opcoes?: { atualizarSelecionado?: boolean },
  ) => {
    const atualizarSelecionado = opcoes?.atualizarSelecionado ?? true;
    setSalvando(true);
    setSalvo(false);
    setErroDetalhesLead(null);

    try {
      let docUrl = urlDocumento ?? documentoAprovacaoUrl.trim();
      
      // Se há arquivo selecionado, fazer upload primeiro
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

        // Se documento foi adicionado, resolver a pendência automaticamente
        if (docUrl) {
          await resolverPendenciaDocumentoAprovacao(leadAtualizado.id);
        }
      }
      
      setSalvando(false);
      setSalvo(true);
      
      // Reset salvo indicator after 2 seconds
      setTimeout(() => setSalvo(false), 2000);
    } catch {
      setErroDetalhesLead("Erro ao salvar lead.");
      setSalvando(false);
    }
  }, [documentoAprovacaoUrl, arquivoSelecionado]);

  // Função que é chamada quando o lead é modificado - com debounce
  const aoMudarLead = useCallback((leadAtualizado: Lead) => {
    setLeadSelecionado(leadAtualizado);
    
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Auto-save após 1 segundo de inatividade
    timeoutRef.current = setTimeout(() => {
      salvarDetalhesLead(leadAtualizado);
    }, 1000);
  }, [salvarDetalhesLead]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Quando documento URL muda, também auto-save
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

  async function criarLead(evento: FormEvent<HTMLFormElement>) {
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
  }

  // Função para resolver automaticamente a pendência de documento de aprovação
  async function resolverPendenciaDocumentoAprovacao(idLead: string) {
    try {
      const resPendencias = await fetch(`/api/pendencias/lead/${idLead}`);
      if (resPendencias.ok) {
        const json = await resPendencias.json();
        const pendencias = json.pendencias ?? [];
        
        // Encontrar a pendência de documento de aprovação pendente
        const pendenciaDocAprovacao = pendencias.find(
          (p: PendenciaLead) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE" && !p.resolvida
        );

        if (pendenciaDocAprovacao) {
          await fetch(`/api/pendencias/${pendenciaDocAprovacao.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resolvida: true }),
          });
          
          // Recarregar pendências do lead e todas as pendências
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
  }

  async function abrirPendenciasLead() {
    if (!leadSelecionado) return;
    const resposta = await fetch(`/api/pendencias/lead/${leadSelecionado.id}`);
    if (resposta.ok) {
      const json = await resposta.json();
      setPendenciasLead(json.pendencias ?? []);
    }
  }

  // Atualiza o URL do documento quando o lead selecionado muda
  useEffect(() => {
    if (leadSelecionado) {
      setDocumentoAprovacaoUrl(leadSelecionado.documento_aprovacao_url ?? "");
    }
  }, [leadSelecionado?.id]);

  // Função para fazer upload do arquivo
  async function handleUploadArquivo(): Promise<string | null> {
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
  }

  async function togglePendenciaResolvida(pendencia: PendenciaLead) {
    const resposta = await fetch(`/api/pendencias/${pendencia.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolvida: !pendencia.resolvida }),
    });

    if (resposta.ok && leadSelecionado) {
      // Atualiza pendências do lead específico
      const resPendencias = await fetch(`/api/pendencias/lead/${leadSelecionado.id}`);
      if (resPendencias.ok) {
        const json = await resPendencias.json();
        setPendenciasLead(json.pendencias ?? []);
        
        // Atualiza todas as pendências para atualizar os badges nos cards
        const resTodas = await fetch("/api/pendencias");
        if (resTodas.ok) {
          const jsonTodas = await resTodas.json();
          setTodasPendencias(jsonTodas.pendencias ?? []);
        }
      }
    }
  }

  // Encontrar estágio "ABERTO" como default
  const estagioAberto = useMemo(() => 
    estagios.find(e => e.tipo === "ABERTO")?.id ?? estagios[0]?.id ?? "",
    [estagios]
  );

  return (
    <section className="space-y-5 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0.0,0,04)] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
            <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Kanban</h1>
            <p className="text-sm text-slate-500">Funil de vendas com arrastar e soltar.</p>
          </div>
        </div>

        <Dialog
          open={dialogNovoLeadAberto}
          onOpenChange={(aberto) => {
            setDialogNovoLeadAberto(aberto);
            if (!aberto) {
              setErroNovoLead(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700 md:w-auto">
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Novo lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar lead</DialogTitle>
            </DialogHeader>

            <form className="space-y-3" onSubmit={criarLead}>
              <Input className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50" name="nome" placeholder="Nome" required />
              <Input
                className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                name="telefone"
                placeholder="Telefone"
                value={telefoneNovoLead}
                onChange={(e) => setTelefoneNovoLead(aplicaMascaraTelefoneBr(e.target.value))}
                required
              />
              <Input
                className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                name="valor_consorcio"
                placeholder="Valor"
                inputMode="numeric"
                value={valorNovoLead}
                onChange={(e) => setValorNovoLead(aplicaMascaraMoedaBr(e.target.value))}
                required
              />

              <input type="hidden" name="id_estagio" value={estagioNovoLead || estagioAberto} />

              <Select value={estagioNovoLead || estagioAberto} onValueChange={setEstagioNovoLead}>
                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
                  <SelectValue placeholder="Estagio" />
                </SelectTrigger>
                <SelectContent>
                  {estagios.map((estagio) => (
                    <SelectItem key={estagio.id} value={estagio.id}>
                      {estagio.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {perfil !== "COLABORADOR" ? (
                <Select
                  onValueChange={(valor) => setCargoNovoLead({ id_funcionario: valor })}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
                    <SelectValue placeholder="Funcionario" />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((funcionario) => (
                      <SelectItem key={funcionario.id} value={funcionario.id}>
                        {funcionario.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              {erroNovoLead ? <p className="text-sm font-medium text-red-600">{erroNovoLead}</p> : null}

              <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" type="submit">Criar lead</Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <DragDropContext onDragEnd={aoDragEnd}>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {estagios.map((estagio) => (
            <Droppable key={estagio.id} droppableId={estagio.id}>
              {(provided) => (
                <div
                  className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {estagio.nome} <span className="font-normal text-slate-400">({leadsPorEstagio[estagio.id]?.length ?? 0})</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    {(leadsPorEstagio[estagio.id] ?? []).map((lead, index) => (
                      <Draggable
                        key={lead.id}
                        draggableId={lead.id}
                        index={index}
                        isDragDisabled={lead.id.startsWith("temp-")}
                      >
                        {(draggableProvided) => (
                          <OptimisticSync active={lead.id.startsWith("temp-")} className="cursor-wait">
                            <Card
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              className={lead.id.startsWith("temp-") ? "bg-transparent" : "cursor-pointer rounded-xl border border-slate-200/60 shadow-sm transition-all duration-200 hover:shadow-md"}
                              onClick={() => {
                                if (lead.id.startsWith("temp-")) return;
                                setLeadSelecionado(lead);
                                const pendenciasDoLead = todasPendencias.filter((p) => p.id_lead === lead.id);
                                setPendenciasLead(pendenciasDoLead);
                              }}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">{lead.nome}</p>
                                    <p className="text-xs text-slate-500">{lead.telefone}</p>
                                    <p className="mt-1 text-sm font-medium text-slate-700">{formataMoeda(lead.valor_consorcio)}</p>
                                  </div>
                                  {pendenciasPorLead[lead.id]?.naoResolvidas > 0 && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                      {pendenciasPorLead[lead.id].naoResolvidas}
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </OptimisticSync>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <Dialog open={Boolean(movimentoPendente)} onOpenChange={(aberto) => !aberto && setMovimentoPendente(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Motivo de perda</DialogTitle>
          </DialogHeader>

          <form className="space-y-3" onSubmit={confirmarPerda}>
            <Textarea className="rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50 min-h-[100px]" value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)} placeholder="Descreva o motivo da perda..." required />
            <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" type="submit">Confirmar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Drawer open={Boolean(leadSelecionado)} onOpenChange={(aberto) => {
        if (!aberto) {
          // Salvar mudanças pendentes antes de fechar
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          if (leadSelecionado) {
            void salvarDetalhesLead(leadSelecionado, documentoAprovacaoUrl, {
              atualizarSelecionado: false,
            });
          }
          setLeadSelecionado(null);
          setSalvo(false);
          setSalvando(false);
        }
      }}>
        <DrawerContent className="mx-auto w-full max-w-xl">
          <DrawerHeader>
            <DrawerTitle>{leadSelecionado?.nome}</DrawerTitle>
            <DrawerDescription>
              <span className="flex items-center gap-2">
                {salvando && <span className="text-amber-600">Salvando...</span>}
                {salvo && !salvando && <span className="text-green-600">Salvo ✓</span>}
                {!salvando && !salvo && "Detalhes do lead"}
              </span>
            </DrawerDescription>
          </DrawerHeader>

          {leadSelecionado ? (
            <div className="space-y-3 p-4 pb-6">
              <Input
                className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                value={leadSelecionado.telefone}
                onChange={(e) =>
                  aoMudarLead({
                    ...leadSelecionado,
                    telefone: aplicaMascaraTelefoneBr(e.target.value),
                  })
                }
              />
              <Input
                className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                inputMode="numeric"
                value={aplicaMascaraMoedaBr(String(Math.round(leadSelecionado.valor_consorcio * 100)))}
                onChange={(e) =>
                  aoMudarLead({
                    ...leadSelecionado,
                    valor_consorcio: converteMoedaBrParaNumero(e.target.value),
                  })
                }
              />
              <Textarea
                className="rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50 min-h-[80px]"
                placeholder="Observações..."
                value={leadSelecionado.observacoes ?? ""}
                onChange={(e) =>
                  aoMudarLead({
                    ...leadSelecionado,
                    observacoes: e.target.value,
                  })
                }
              />

              {/* Campo de Documento de Aprovação */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Documento de Aprovação (PDF)
                </label>
                
                {/* Input de arquivo */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    id="documento-upload"
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-sky-50 file:text-sky-700
                      hover:file:bg-sky-100
                    "
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      if (arquivo) {
                        if (arquivo.type !== "application/pdf") {
                          setErroDetalhesLead("Apenas arquivos PDF são permitidos.");
                          return;
                        }
                        if (arquivo.size > 10 * 1024 * 1024) {
                          setErroDetalhesLead("Arquivo muito grande. Máximo 10MB.");
                          return;
                        }
                        setArquivoSelecionado(arquivo);
                        setErroDetalhesLead(null);
                        // Auto-save ao selecionar arquivo
                        setTimeout(() => salvarDetalhesLead(leadSelecionado), 100);
                      }
                    }}
                  />
                </div>
                {arquivoSelecionado && (
                  <p className="text-sm text-sky-600">
                    Arquivo selecionado: {arquivoSelecionado.name}
                  </p>
                )}

                {/* Input de URL alternativa */}
                <div className="relative">
                  <p className="mb-1 text-xs font-medium text-slate-500">Ou cole uma URL:</p>
                  <Input
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                    placeholder="URL do documento (Google Drive, etc)"
                    value={documentoAprovacaoUrl}
                    onChange={(e) => {
                      setDocumentoAprovacaoUrl(e.target.value);
                      if (e.target.value) setArquivoSelecionado(null);
                    }}
                  />
                </div>
                
                {/* Link para visualizar documento atual */}
                {leadSelecionado?.documento_aprovacao_url && (
                  <a
                    href={leadSelecionado.documento_aprovacao_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm font-medium text-sky-600 hover:underline"
                  >
                    Ver documento atual
                  </a>
                )}

                <p className="text-xs text-slate-500">
                  O documento de aprovação é opcional, mas sua ausência gera uma pendência.
                </p>
              </div>

              {/* Alerta de pendência de documento */}
              {pendenciasLead.some((p) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE" && !p.resolvida) && (
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 text-sm text-amber-800 shadow-sm">
                  <p className="font-semibold">Pendencia: Documento de Aprovacao</p>
                  <p className="text-xs mt-1">Este lead nao possui documento de aprovacao anexado.</p>
                </div>
              )}

              {leadSelecionado.motivo_perda ? (
                <div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 text-sm text-rose-700 shadow-sm">
                  <p className="font-semibold">Motivo da perda:</p>
                  <p className="text-xs mt-1">{leadSelecionado.motivo_perda}</p>
                </div>
              ) : null}

              {/* Pendências do lead -可以直接resolver */}
              {pendenciasLead.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Pendencias</p>
                  {pendenciasLead.map((pendencia) => (
                    <div
                      key={pendencia.id}
                      className={`flex items-center justify-between rounded-xl border p-3 ${
                        pendencia.resolvida ? "border-emerald-200/60 bg-emerald-50/50" : "border-rose-200/60 bg-rose-50/50"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {LABELS_PENDENCIA[pendencia.tipo as TipoPendencia] || pendencia.tipo}
                        </p>
                        <p className="text-xs text-slate-500">{pendencia.descricao}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={pendencia.resolvida}
                        onChange={() => togglePendenciaResolvida(pendencia)}
                        className="h-5 w-5 rounded border-slate-300 text-slate-600 focus:ring-slate-400 focus:ring-offset-2"
                      />
                    </div>
                  ))}
                </div>
              )}

              {erroDetalhesLead ? <p className="text-sm font-medium text-rose-600">{erroDetalhesLead}</p> : null}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  asChild
                  className="flex-1 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <a
                    href={`https://wa.me/${normalizaTelefoneParaWhatsapp(leadSelecionado.telefone)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl text-sm font-medium"
                  onClick={async () => {
                    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
                    
                    const resposta = await fetch(`/api/leads/${leadSelecionado.id}`, {
                      method: "DELETE",
                    });

                    if (resposta.ok) {
                      setLeads((atual) => atual.filter((item) => item.id !== leadSelecionado.id));
                      setLeadSelecionado(null);
                    } else {
                      const json = await resposta.json();
                      setErroDetalhesLead(json.erro ?? "Erro ao excluir lead.");
                    }
                  }}
                >
                  Excluir
                </Button>
              </div>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </section>
  );
}
