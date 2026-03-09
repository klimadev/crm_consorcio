"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, Banknote, FileText, Loader2, MessageCircle, Package, Phone, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { aprovarLeadKanban } from "@/lib/api/kanban";
import { useWhatsappChat } from "@/modules/whatsapp/hooks/use-whatsapp-chat";
import { WhatsappChatPanel } from "@/modules/whatsapp/components/chat/whatsapp-chat-panel";
import type { Estagio, Funcionario, Lead, PendenciaDinamica, StatusSalvamentoDetalhesLead } from "../types";
import { obterMensagemErroKanban } from "../utils/erro";
import { MENSAGENS_KANBAN } from "../utils/mensagens";
import { EmptyState } from "./empty-state";
import { LeadDeleteConfirmDialog } from "./lead-delete-confirm-dialog";
import { LeadDetailsTabContent } from "./lead-details-tab-content";
import { LeadParcelasTab } from "./lead-parcelas-tab";
import { LeadProdutosTab } from "./lead-produtos-tab";

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
    opcoes?: { atualizarSelecionado?: boolean; arquivoUpload?: File | null },
  ) => Promise<void>;
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
  } = props;

  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const [fecharConfirmado, setFecharConfirmado] = useState(false);
  const [confirmarExclusaoAberta, setConfirmarExclusaoAberta] = useState(false);
  const [tabAtiva, setTabAtiva] = useState("detalhes");
  const [aprovando, setAprovando] = useState(false);
  const [excluindoLead, setExcluindoLead] = useState(false);
  const [erroExclusaoLead, setErroExclusaoLead] = useState<string | null>(null);
  const [mostrarTrocaDocumento, setMostrarTrocaDocumento] = useState(false);
  const [modoDocumento, setModoDocumento] = useState<"arquivo" | "url">("arquivo");

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
        classe: "text-rose-200",
        icone: <AlertCircle className="h-3 w-3" />,
      };
    }

    const mapaStatus: Record<StatusSalvamentoDetalhesLead, { texto: string; classe: string; icone?: ReactNode }> = {
      erro: {
        texto: erroDetalhesLead ?? MENSAGENS_KANBAN.erro.generico,
        classe: "text-rose-200",
        icone: <AlertCircle className="h-3 w-3" />,
      },
      uploadando: {
        texto: "Enviando documento para o lead...",
        classe: "text-amber-100",
        icone: <Loader2 className="h-3 w-3 animate-spin" />,
      },
      salvando_automaticamente: {
        texto: "Salvando alteracoes automaticamente...",
        classe: "text-amber-100",
        icone: <Loader2 className="h-3 w-3 animate-spin" />,
      },
      salvando_manual: {
        texto: "Salvando alteracoes do lead...",
        classe: "text-amber-100",
        icone: <Loader2 className="h-3 w-3 animate-spin" />,
      },
      salvo: {
        texto: textoUltimaAtualizacao ? `Ultima atualizacao salva as ${textoUltimaAtualizacao}.` : "Alteracoes salvas com sucesso.",
        classe: "text-emerald-100",
      },
      pendente: {
        texto: "Alteracoes detectadas. Salvamento automatico em instantes.",
        classe: "text-amber-100",
        icone: <AlertCircle className="h-3 w-3" />,
      },
      ocioso: {
        texto: textoUltimaAtualizacao ? `Tudo salvo. Ultima atualizacao as ${textoUltimaAtualizacao}.` : `Edite os detalhes e use ${atalhoSalvar} para salvar na hora.`,
        classe: "text-emerald-100",
      },
    };

    const statusBase = mapaStatus[statusSalvamentoDetalhes];

    if (!salvando && !salvandoAutomaticamente && !salvo && hasChanges && !salvamentoAutomaticoPendente) {
      return {
        texto: "Existem alteracoes locais aguardando salvamento.",
        classe: "text-amber-100",
        icone: <AlertCircle className="h-3 w-3" />,
      };
    }

    return statusBase;
  }, [atalhoSalvar, erroDetalhesLead, hasChanges, salvando, salvandoAutomaticamente, salvamentoAutomaticoPendente, salvo, statusSalvamentoDetalhes, textoUltimaAtualizacao]);

  const handleOpenChange = useCallback((aberto: boolean) => {
    if (aberto) {
      onOpenChange(true);
      return;
    }

    if (confirmarExclusaoAberta) {
      return;
    }

    let fechamentoConfirmadoAgora = false;

    if (!aberto && !fecharConfirmado && hasChanges) {
      const confirmar = window.confirm(MENSAGENS_KANBAN.confirmacao.descartarAlteracoes);
      if (!confirmar) return;
      setFecharConfirmado(true);
      fechamentoConfirmadoAgora = true;
    }

    if (!hasChanges || fecharConfirmado || fechamentoConfirmadoAgora) {
      onOpenChange(false);
      setFecharConfirmado(false);
      setTemAlteracoes(false);
      setTabAtiva("detalhes");
    }
  }, [confirmarExclusaoAberta, fecharConfirmado, hasChanges, onOpenChange]);

  const handleSalvar = useCallback(async () => {
    if (!leadSelecionado) return;
    await onSalvarDetalhesLead(leadSelecionado, documentoAprovacaoUrl, { atualizarSelecionado: false });
    setTemAlteracoes(false);
  }, [documentoAprovacaoUrl, leadSelecionado, onSalvarDetalhesLead]);

  const handleAprovarLead = async () => {
    if (!leadSelecionado) return;
    setAprovando(true);
    setErroDetalhesLead(null);

    try {
      const resultado = await aprovarLeadKanban(leadSelecionado.id);
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

      if (event.key !== "Escape") return;

      if (confirmarExclusaoAberta) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      handleOpenChange(false);
    };

    window.addEventListener("keydown", handleAtalhos, true);
    return () => window.removeEventListener("keydown", handleAtalhos, true);
  }, [confirmarExclusaoAberta, handleOpenChange, handleSalvar, hasChanges, leadSelecionado, salvando, uploadando]);

  useEffect(() => {
    if (statusSalvamentoDetalhes === "salvo") {
      setTemAlteracoes(false);
    }

    if (!leadSelecionado) {
      setTemAlteracoes(false);
      setErroExclusaoLead(null);
      setConfirmarExclusaoAberta(false);
    }
  }, [leadSelecionado, statusSalvamentoDetalhes]);

  return (
    <>
      <Sheet open={Boolean(leadSelecionado)} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="space-y-0 border-b bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <MessageCircle className="h-5 w-5 shrink-0" />
                <SheetTitle className="truncate text-base text-white">{leadSelecionado?.nome}</SheetTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-white hover:bg-white/20" onClick={() => handleOpenChange(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="flex items-center gap-2 text-emerald-100">
              <Phone className="h-3 w-3" />
              <span>{leadSelecionado?.telefone ?? "Sem telefone informado"}</span>
              <span className={`inline-flex items-center gap-1 ${statusSalvar.classe}`}>
                {statusSalvar.icone ?? null}
                {statusSalvar.texto}
              </span>
            </SheetDescription>
            <p className="text-xs text-emerald-100/90">Atalhos: {atalhoSalvar} salva agora • Esc fecha o drawer</p>
          </SheetHeader>

          {podeRenderizarConteudo && leadSelecionado ? (
            <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="flex min-h-0 flex-1 flex-col">
              <div className="border-b bg-slate-50 px-4 py-2">
                <TabsList className="grid w-full grid-cols-4 bg-slate-200">
                  <TabsTrigger value="detalhes" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Detalhes
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="relative text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chat
                    {whatsappChat.unreadCount > 0 ? <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-red-500" /> : null}
                  </TabsTrigger>
                  <TabsTrigger value="parcelas" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Banknote className="mr-2 h-4 w-4" />
                    Parcelas
                  </TabsTrigger>
                  <TabsTrigger value="produtos" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Package className="mr-2 h-4 w-4" />
                    Produtos
                  </TabsTrigger>
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
                  onExcluir={() => {
                    setErroExclusaoLead(null);
                    setConfirmarExclusaoAberta(true);
                  }}
                  hasChanges={hasChanges}
                  aprovando={aprovando}
                  mostrarTrocaDocumento={mostrarTrocaDocumento}
                  setMostrarTrocaDocumento={setMostrarTrocaDocumento}
                  modoDocumento={modoDocumento}
                  setModoDocumento={setModoDocumento}
                  temAlteracoes={temAlteracoes}
                  setTemAlteracoes={setTemAlteracoes}
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

              <TabsContent value="parcelas" className="m-0 flex-1 overflow-y-auto p-4">
                <LeadParcelasTab leadId={leadSelecionado.id} />
              </TabsContent>

              <TabsContent value="produtos" className="m-0 flex-1 overflow-y-auto p-4">
                <LeadProdutosTab leadId={leadSelecionado.id} />
              </TabsContent>
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
    </>
  );
}
