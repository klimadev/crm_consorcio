"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, Banknote, FileText, Loader2, MessageCircle, Phone, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { aprovarLeadKanban } from "@/lib/api/kanban";
import { useWhatsappChat } from "@/modules/whatsapp/hooks/use-whatsapp-chat";
import { WhatsappChatPanel } from "@/modules/whatsapp/components/chat/whatsapp-chat-panel";
import type { Estagio, Funcionario, Lead, PendenciaDinamica, StatusSalvamentoDetalhesLead } from "../types";
import { obterMensagemErroKanban } from "../utils/erro";
import { MENSAGENS_KANBAN } from "../utils/mensagens";
import { EmptyState } from "./empty-state";
import { ConfirmDialog } from "./confirm-dialog";
import { LeadDeleteConfirmDialog } from "./lead-delete-confirm-dialog";
import { LeadDetailsTabContent } from "./lead-details-tab-content";
import { LeadParcelasTab } from "./lead-parcelas-tab";

function obterDataLocalAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

type LeadDetailsDrawerProps = {
  leadSelecionado: Lead | null;
  pendenciasLead: PendenciaDinamica[];
  onOpenChange: (aberto: boolean) => void;
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  estagios: Estagio[];
  funcionarios: Funcionario[];
  onMudarLead: (leadAtualizado: Lead) => void;
  documentoAprovacaoUrl: string;
  setDocumentoAprovacaoUrl: (url: string) => void;
  arquivoSelecionado: File | null;
  setArquivoSelecionado: (file: File | null) => void;
  uploadando: boolean;
  salvando: boolean;
  salvo: boolean;
  salvandoAutomaticamente: boolean;
  salvamentoAutomaticoPendente: boolean;
  ultimaAtualizacaoSalvaEm: Date | null;
  statusSalvamentoDetalhes: StatusSalvamentoDetalhesLead;
  erroDetalhesLead: string | null;
  setErroDetalhesLead: (erro: string | null) => void;
  onExcluirLead: (id: string) => Promise<void>;
  onSalvarDetalhesLead: (
    lead: Lead,
    urlDocumento?: string,
    opcoes?: { atualizarSelecionado?: boolean; arquivoUpload?: File | null; dataVenda?: string },
  ) => Promise<void>;
  onRemoverDocumento: () => Promise<void>;
};

export function LeadDetailsDrawer(props: LeadDetailsDrawerProps) {
  const { addToast } = useToast();
  const {
    leadSelecionado,
    pendenciasLead,
    onOpenChange,
    perfil,
    estagios,
    funcionarios,
    onMudarLead,
    documentoAprovacaoUrl,
    setDocumentoAprovacaoUrl,
    arquivoSelecionado,
    setArquivoSelecionado,
    uploadando,
    salvando,
    salvo,
    salvandoAutomaticamente,
    salvamentoAutomaticoPendente,
    ultimaAtualizacaoSalvaEm,
    statusSalvamentoDetalhes,
    erroDetalhesLead,
    setErroDetalhesLead,
    onExcluirLead,
    onSalvarDetalhesLead,
    onRemoverDocumento,
  } = props;

  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const [confirmarFechamentoAberto, setConfirmarFechamentoAberto] = useState(false);
  const [confirmarExclusaoAberta, setConfirmarExclusaoAberta] = useState(false);
  const [tabAtiva, setTabAtiva] = useState("detalhes");
  const [aprovando, setAprovando] = useState(false);
  const [excluindoLead, setExcluindoLead] = useState(false);
  const [erroExclusaoLead, setErroExclusaoLead] = useState<string | null>(null);
  const [mostrarTrocaDocumento, setMostrarTrocaDocumento] = useState(false);
  const [modoDocumento, setModoDocumento] = useState<"arquivo" | "url">("arquivo");
  const [dataAprovacao, setDataAprovacao] = useState(obterDataLocalAtual());

  const initialUrl = leadSelecionado?.documento_aprovacao_url ?? "";
  const hasChanges = temAlteracoes || documentoAprovacaoUrl !== initialUrl;
  const podeRenderizarConteudo = Boolean(leadSelecionado?.id && leadSelecionado.nome);

  const whatsappChat = useWhatsappChat({
    leadId: leadSelecionado?.id,
    enabled: Boolean(leadSelecionado),
    markReadEnabled: tabAtiva === "chat" && Boolean(leadSelecionado),
    pollMs: 30000,
  });

  const textoUltimaAtualizacao = useMemo(() => {
    if (!ultimaAtualizacaoSalvaEm) return null;

    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(ultimaAtualizacaoSalvaEm);
  }, [ultimaAtualizacaoSalvaEm]);

  const atalhoSalvar = useMemo(() => {
    if (typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac")) {
      return "Cmd+S";
    }

    return "Ctrl+S";
  }, []);

  const statusSalvar = useMemo(() => {
    if (erroDetalhesLead) {
      return {
        texto: erroDetalhesLead,
        classe: "text-destructive",
        icone: <AlertCircle className="h-3 w-3" />,
      };
    }

    const mapaStatus: Record<StatusSalvamentoDetalhesLead, { texto: string; classe: string; icone?: ReactNode }> = {
      erro: {
        texto: erroDetalhesLead ?? MENSAGENS_KANBAN.erro.generico,
        classe: "text-destructive",
        icone: <AlertCircle className="h-3 w-3" />,
      },
      uploadando: {
        texto: "Enviando documento para o lead...",
        classe: "text-warning",
        icone: <Loader2 className="h-3 w-3 animate-spin" />,
      },
      salvando_automaticamente: {
        texto: "Salvando alteracoes automaticamente...",
        classe: "text-warning",
        icone: <Loader2 className="h-3 w-3 animate-spin" />,
      },
      salvando_manual: {
        texto: "Salvando alteracoes do lead...",
        classe: "text-warning",
        icone: <Loader2 className="h-3 w-3 animate-spin" />,
      },
      salvo: {
        texto: textoUltimaAtualizacao ? `Ultima atualizacao salva as ${textoUltimaAtualizacao}.` : "Alteracoes salvas com sucesso.",
        classe: "text-success",
      },
      pendente: {
        texto: "Alteracoes detectadas. Salvamento automatico em instantes.",
        classe: "text-warning",
        icone: <AlertCircle className="h-3 w-3" />,
      },
      ocioso: {
        texto: textoUltimaAtualizacao ? `Tudo salvo. Ultima atualizacao as ${textoUltimaAtualizacao}.` : `Edite os detalhes e use ${atalhoSalvar} para salvar na hora.`,
        classe: "text-success",
      },
    };

    const statusBase = mapaStatus[statusSalvamentoDetalhes];

    if (!salvando && !salvandoAutomaticamente && !salvo && hasChanges && !salvamentoAutomaticoPendente) {
      return {
        texto: "Existem alteracoes locais aguardando salvamento.",
        classe: "text-warning",
        icone: <AlertCircle className="h-3 w-3" />,
      };
    }

    return statusBase;
  }, [atalhoSalvar, erroDetalhesLead, hasChanges, salvando, salvandoAutomaticamente, salvamentoAutomaticoPendente, salvo, statusSalvamentoDetalhes, textoUltimaAtualizacao]);

  const resumoLead = useMemo(() => {
    if (!leadSelecionado) {
      return null;
    }

    const estagioAtual = estagios.find((estagio) => estagio.id === leadSelecionado.id_estagio);
    const temPendenciaDocumento = pendenciasLead.some((pendencia) => pendencia.tipo === "DOCUMENTO_APROVACAO_PENDENTE");
    const temPendenciaAprovacao = pendenciasLead.some((pendencia) => pendencia.tipo === "APROVACAO_GERENCIA_PENDENTE");
    const diasParados = Math.floor((Date.now() - new Date(leadSelecionado.atualizado_em).getTime()) / (1000 * 60 * 60 * 24));

    let proximoPasso = "Atualizar dados do lead";
    let tom = "border-border/70 bg-muted/80 text-foreground";
    let status = "Em andamento";

    if (estagioAtual?.nome === "Pré Aprovação" && (temPendenciaDocumento || !leadSelecionado.documento_aprovacao_url)) {
      proximoPasso = "Enviar documento de aprovação";
      status = "Crítico";
      tom = "border-destructive/30 bg-destructive/10 text-foreground";
    } else if (estagioAtual?.nome === "Pré Aprovação" && (temPendenciaAprovacao || !leadSelecionado.aprovado_em)) {
      proximoPasso = "Aguardar análise da empresa";
      status = "Aguardando análise";
      tom = "border-warning/30 bg-warning/10 text-foreground";
    } else if (leadSelecionado.aprovado_em) {
      proximoPasso = "Mover para fechado";
      status = "Aprovado";
      tom = "border-success/30 bg-success/10 text-foreground";
    } else if (diasParados > 3) {
      proximoPasso = "Retomar contato comercial";
      status = `${diasParados}d parado`;
      tom = "border-warning/30 bg-warning/10 text-foreground";
    }

    return {
      estagio: estagioAtual?.nome ?? "Sem estágio",
      status,
      proximoPasso,
      diasParados,
      tom,
    };
  }, [estagios, leadSelecionado, pendenciasLead]);

  const fecharDrawer = useCallback(() => {
    onOpenChange(false);
    setTemAlteracoes(false);
    setConfirmarFechamentoAberto(false);
    setTabAtiva("detalhes");
  }, [onOpenChange]);

  const handleOpenChange = useCallback((aberto: boolean) => {
    if (aberto) {
      onOpenChange(true);
      return;
    }

    if (confirmarExclusaoAberta) {
      return;
    }

    if (hasChanges) {
      setConfirmarFechamentoAberto(true);
      return;
    }

    fecharDrawer();
  }, [confirmarExclusaoAberta, fecharDrawer, hasChanges, onOpenChange]);

  const handleSalvar = useCallback(async () => {
    if (!leadSelecionado) return;
    await onSalvarDetalhesLead(leadSelecionado, documentoAprovacaoUrl, { atualizarSelecionado: false });
    setTemAlteracoes(false);
  }, [documentoAprovacaoUrl, leadSelecionado, onSalvarDetalhesLead]);

  const handleSalvarDataVenda = useCallback(async () => {
    if (!leadSelecionado) return;
    await onSalvarDetalhesLead(leadSelecionado, documentoAprovacaoUrl, {
      atualizarSelecionado: false,
      dataVenda: dataAprovacao,
    });
    setTemAlteracoes(false);
  }, [dataAprovacao, documentoAprovacaoUrl, leadSelecionado, onSalvarDetalhesLead]);

  const handleAprovarLead = async () => {
    if (!leadSelecionado) return;
    setAprovando(true);
    setErroDetalhesLead(null);

    try {
      const resultado = await aprovarLeadKanban(leadSelecionado.id, { data_aprovacao: dataAprovacao });
      if (!resultado.ok) {
        setErroDetalhesLead(resultado.erro);
        return;
      }
      if (resultado.dados.lead) onMudarLead(resultado.dados.lead);
      addToast({
        type: "success",
        title: "Lead aprovado",
        description: "O lead esta liberado para avancar no funil.",
      });
    } catch (erro) {
      setErroDetalhesLead(obterMensagemErroKanban(erro, MENSAGENS_KANBAN.erro.aprovarLead));
    } finally {
      setAprovando(false);
    }
  };

  const handleEnviarArquivo = async () => {
    if (!leadSelecionado || !arquivoSelecionado) return;
    await onSalvarDetalhesLead(leadSelecionado, undefined, { arquivoUpload: arquivoSelecionado });
    setTemAlteracoes(false);
    setMostrarTrocaDocumento(false);
  };

  const handleSalvarUrlDocumento = async () => {
    if (!leadSelecionado) return;
    const url = documentoAprovacaoUrl.trim();
    if (!url) {
      setErroDetalhesLead(MENSAGENS_KANBAN.erro.urlDocumentoInvalida);
      return;
    }

    try {
      const urlValidada = new URL(url);
      if (!["http:", "https:"].includes(urlValidada.protocol)) {
        setErroDetalhesLead(MENSAGENS_KANBAN.erro.urlDocumentoInvalida);
        return;
      }
    } catch {
      setErroDetalhesLead(MENSAGENS_KANBAN.erro.urlDocumentoInvalida);
      return;
    }

    await onSalvarDetalhesLead(leadSelecionado, url);
    setTemAlteracoes(false);
    setMostrarTrocaDocumento(false);
  };

  useEffect(() => {
    if (!leadSelecionado) return;

    const handleAtalhos = (event: KeyboardEvent) => {
      const tecla = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && tecla === "s") {
        if (!hasChanges || salvando || uploadando) return;
        event.preventDefault();
        void handleSalvar();
        return;
      }

    };

    window.addEventListener("keydown", handleAtalhos, true);
    return () => window.removeEventListener("keydown", handleAtalhos, true);
  }, [handleSalvar, hasChanges, leadSelecionado, salvando, uploadando]);

  useEffect(() => {
    if (statusSalvamentoDetalhes === "salvo") {
      setTemAlteracoes(false);
    }

    if (!leadSelecionado) {
      setDataAprovacao(obterDataLocalAtual());
      setTemAlteracoes(false);
      setErroExclusaoLead(null);
      setConfirmarFechamentoAberto(false);
      setConfirmarExclusaoAberta(false);
    }
  }, [leadSelecionado, statusSalvamentoDetalhes]);

  useEffect(() => {
    if (!leadSelecionado) return;

    if (leadSelecionado.aprovado_em) {
      setDataAprovacao(leadSelecionado.aprovado_em.slice(0, 10));
      return;
    }

    setDataAprovacao(obterDataLocalAtual());
  }, [leadSelecionado]);

  return (
    <>
      <Sheet open={Boolean(leadSelecionado)} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-2xl lg:max-w-[48rem]"
        >
          <SheetHeader className="space-y-0 border-b bg-background-elevated px-3 py-2.5 text-foreground sm:px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0 text-success" />
                  <SheetTitle className="truncate text-base text-foreground">{leadSelecionado?.nome}</SheetTitle>
                </div>
                <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-muted">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {leadSelecionado?.telefone ?? "Sem telefone informado"}
                  </span>
                  {resumoLead ? <span className="text-foreground-disabled">{resumoLead.estagio}</span> : null}
                </SheetDescription>
                {resumoLead ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                    <span className={cn("rounded-full border px-2.5 py-1", resumoLead.tom)}>
                      {resumoLead.status}
                    </span>
                    {resumoLead.diasParados > 3 ? (
                      <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-warning">
                        {resumoLead.diasParados}d parado
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-muted" onClick={() => handleOpenChange(false)} aria-label="Fechar drawer">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <span className={cn("inline-flex items-center gap-1", statusSalvar.classe)}>
                {statusSalvar.icone ?? null}
                {statusSalvar.texto}
              </span>
              <span className="text-foreground-disabled">Atalho: {atalhoSalvar}</span>
              {resumoLead ? (
                <span className="truncate text-foreground-muted">Próximo passo: {resumoLead.proximoPasso}</span>
              ) : null}
            </div>
          </SheetHeader>

          {podeRenderizarConteudo && leadSelecionado ? (
            <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="flex min-h-0 flex-1 flex-col">
              <div className="border-b bg-muted px-3 py-1.5">
                <TabsList className="grid h-10 w-full grid-cols-3 bg-background-surface">
                  <TabsTrigger value="detalhes" className="text-sm data-[state=active]:bg-background-surface data-[state=active]:shadow-sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Detalhes
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="relative text-sm data-[state=active]:bg-background-surface data-[state=active]:shadow-sm">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chat
                    {whatsappChat.unreadCount > 0 ? <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-destructive" /> : null}
                  </TabsTrigger>
                  <TabsTrigger value="parcelas" className="text-sm data-[state=active]:bg-background-surface data-[state=active]:shadow-sm">
                    <Banknote className="mr-2 h-4 w-4" />
                    Parcelas
                  </TabsTrigger>
                  {/* [HYPE CRM] Feature em desenvolvimento - Produtos será uma feature exclusiva do HYPE CRM */}
                  {/* <TabsTrigger value="produtos" className="text-sm data-[state=active]:bg-background-surface data-[state=active]:shadow-sm">
                    <Package className="mr-2 h-4 w-4" />
                    Produtos
                  </TabsTrigger> */}
                </TabsList>
              </div>

              <TabsContent value="detalhes" className="m-0 flex-1 overflow-y-auto">
                <LeadDetailsTabContent
                  leadSelecionado={leadSelecionado}
                  perfil={perfil}
                  estagios={estagios}
                  funcionarios={funcionarios}
                  pendenciasLead={pendenciasLead}
                  documentoAprovacaoUrl={documentoAprovacaoUrl}
                  setDocumentoAprovacaoUrl={setDocumentoAprovacaoUrl}
                  arquivoSelecionado={arquivoSelecionado}
                  setArquivoSelecionado={setArquivoSelecionado}
                  uploadando={uploadando}
                  salvando={salvando}
                  erroDetalhesLead={erroDetalhesLead}
                  setErroDetalhesLead={setErroDetalhesLead}
                  onMudarLead={(leadAtualizado) => {
                    onMudarLead(leadAtualizado);
                    setTemAlteracoes(true);
                  }}
                  onSalvar={handleSalvar}
                  onEnviarArquivo={handleEnviarArquivo}
                  onSalvarUrlDocumento={handleSalvarUrlDocumento}
                  onAprovarLead={handleAprovarLead}
                  dataAprovacao={dataAprovacao}
                  setDataAprovacao={setDataAprovacao}
                  onExcluir={() => {
                    setErroExclusaoLead(null);
                    setConfirmarExclusaoAberta(true);
                  }}
                  onSalvarDataVenda={handleSalvarDataVenda}
                  hasChanges={hasChanges}
                  aprovando={aprovando}
                  mostrarTrocaDocumento={mostrarTrocaDocumento}
                  setMostrarTrocaDocumento={setMostrarTrocaDocumento}
                  modoDocumento={modoDocumento}
                  setModoDocumento={setModoDocumento}
                  temAlteracoes={temAlteracoes}
                  setTemAlteracoes={setTemAlteracoes}
                  onRemoverDocumento={onRemoverDocumento}
                />
              </TabsContent>

              <TabsContent value="chat" className="m-0 flex-1 overflow-hidden">
                <WhatsappChatPanel
                  leadNome={leadSelecionado?.nome ?? "Lead"}
                  messages={whatsappChat.messages}
                  connectionStatus={whatsappChat.connectionStatus}
                  loading={whatsappChat.loading}
                  sending={whatsappChat.sending}
                  canSend={whatsappChat.canSend}
                  error={whatsappChat.error}
                  blockedState={whatsappChat.blockedState}
                  onSendMessage={whatsappChat.sendMessage}
                  onRetryMessage={whatsappChat.retryMessage}
                />
              </TabsContent>

              <TabsContent value="parcelas" className="m-0 flex-1 overflow-y-auto p-3">
                <LeadParcelasTab leadId={leadSelecionado.id} />
              </TabsContent>

              {/* [HYPE CRM] Feature em desenvolvimento - Produtos será uma feature exclusiva do HYPE CRM */}
              {/* <TabsContent value="produtos" className="m-0 flex-1 overflow-y-auto p-4">
                <LeadProdutosTab leadId={leadSelecionado.id} />
              </TabsContent> */}
            </Tabs>
          ) : (
            <EmptyState
              icone={<Loader2 className="h-6 w-6 animate-spin" />}
              titulo="Preparando detalhes do lead"
              descricao="Os dados do drawer ainda nao ficaram prontos para exibicao."
            />
          )}
        </SheetContent>
      </Sheet>

      <LeadDeleteConfirmDialog
        aberto={confirmarExclusaoAberta && Boolean(leadSelecionado)}
        nomeLead={leadSelecionado?.nome ?? ""}
        excluindo={excluindoLead}
        erro={erroExclusaoLead}
        onCancelar={() => {
          if (excluindoLead) return;
          setErroExclusaoLead(null);
          setConfirmarExclusaoAberta(false);
        }}
        onConfirmar={async () => {
          if (!leadSelecionado || excluindoLead) return;
          setExcluindoLead(true);
          setErroExclusaoLead(null);
          try {
            await onExcluirLead(leadSelecionado.id);
            setConfirmarExclusaoAberta(false);
          } catch (error) {
            setErroExclusaoLead(obterMensagemErroKanban(error, "Nao foi possivel excluir o lead. Tente novamente."));
          } finally {
            setExcluindoLead(false);
          }
        }}
      />

      <ConfirmDialog
        aberto={confirmarFechamentoAberto && Boolean(leadSelecionado)}
        titulo="Descartar alterações?"
        descricao={<p>{MENSAGENS_KANBAN.confirmacao.descartarAlteracoes}</p>}
        erro={null}
        confirmando={false}
        textoCancel={MENSAGENS_KANBAN.confirmacao.cancelar}
        textoConfirmar="Descartar e fechar"
        onCancelar={() => setConfirmarFechamentoAberto(false)}
        onConfirmar={async () => {
          fecharDrawer();
        }}
        modo="destrutivo"
      />
    </>
  );
}
