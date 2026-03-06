"use client";

import { useState } from "react";
import { AlertCircle, Banknote, FileText, MessageCircle, Phone, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aprovarLeadKanban } from "@/lib/api/kanban";
import { useWhatsappChat } from "@/modules/whatsapp/hooks/use-whatsapp-chat";
import { WhatsappChatPanel } from "@/modules/whatsapp/components/chat/whatsapp-chat-panel";
import type { Estagio, Funcionario, Lead, PendenciaDinamica } from "../types";
import { LeadDeleteConfirmDialog } from "./lead-delete-confirm-dialog";
import { LeadDetailsTabContent } from "./lead-details-tab-content";
import { LeadParcelasTab } from "./lead-parcelas-tab";

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
  const [mostrarTrocaDocumento, setMostrarTrocaDocumento] = useState(false);
  const [modoDocumento, setModoDocumento] = useState<"arquivo" | "url">("arquivo");

  const initialUrl = leadSelecionado?.documento_aprovacao_url ?? "";
  const hasChanges = temAlteracoes || documentoAprovacaoUrl !== initialUrl;

  const whatsappChat = useWhatsappChat({
    leadId: leadSelecionado?.id,
    enabled: Boolean(leadSelecionado),
    markReadEnabled: tabAtiva === "chat" && Boolean(leadSelecionado),
    pollMs: 30000,
  });

  const chatBloqueadoPorPdv = whatsappChat.error?.includes("configurada no PDV")
    ? "Lead sem instancia WhatsApp configurada no PDV."
    : null;

  const handleOpenChange = (aberto: boolean) => {
    if (!aberto && !fecharConfirmado && hasChanges) {
      const confirmar = window.confirm("Você tem alterações não salvas. Deseja descartar as alterações?");
      if (!confirmar) return;
      setFecharConfirmado(true);
    }

    if (aberto || !hasChanges || fecharConfirmado) {
      onOpenChange(false);
      setFecharConfirmado(false);
      setTemAlteracoes(false);
      setTabAtiva("detalhes");
    }
  };

  const handleSalvar = async () => {
    if (!leadSelecionado) return;
    await onSalvarDetalhesLead(leadSelecionado, documentoAprovacaoUrl, { atualizarSelecionado: false });
    setTemAlteracoes(false);
  };

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
    } catch {
      setErroDetalhesLead("Erro ao aprovar lead.");
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
      setErroDetalhesLead("Informe uma URL valida ou envie um arquivo PDF.");
      return;
    }
    await onSalvarDetalhesLead(leadSelecionado, url);
    setTemAlteracoes(false);
    setMostrarTrocaDocumento(false);
  };

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
              {leadSelecionado?.telefone}
              {salvando ? <span className="text-amber-200">• Salvando...</span> : null}
              {salvo && !salvando ? <span className="text-emerald-200">• Salvo ✓</span> : null}
              {!salvando && !salvo && hasChanges ? (
                <span className="flex items-center gap-1 text-amber-200">
                  <AlertCircle className="h-3 w-3" />
                  Alterações não salvas
                </span>
              ) : null}
            </SheetDescription>
          </SheetHeader>

          {leadSelecionado ? (
            <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="flex min-h-0 flex-1 flex-col">
              <div className="border-b bg-slate-50 px-4 py-2">
                <TabsList className="grid w-full grid-cols-3 bg-slate-200">
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
                  onExcluir={() => setConfirmarExclusaoAberta(true)}
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
                  leadNome={leadSelecionado.nome}
                  messages={whatsappChat.messages}
                  connectionStatus={whatsappChat.connectionStatus}
                  loading={whatsappChat.loading}
                  sending={whatsappChat.sending}
                  canSend={whatsappChat.canSend}
                  error={whatsappChat.error}
                  blockedReason={chatBloqueadoPorPdv}
                  onSendMessage={whatsappChat.sendMessage}
                  onRetryMessage={whatsappChat.retryMessage}
                />
              </TabsContent>

              <TabsContent value="parcelas" className="m-0 flex-1 overflow-y-auto p-4">
                <LeadParcelasTab leadId={leadSelecionado.id} />
              </TabsContent>
            </Tabs>
          ) : null}
        </SheetContent>
      </Sheet>

      <LeadDeleteConfirmDialog
        aberto={confirmarExclusaoAberta && Boolean(leadSelecionado)}
        nomeLead={leadSelecionado?.nome ?? ""}
        onCancelar={() => setConfirmarExclusaoAberta(false)}
        onConfirmar={async () => {
          if (!leadSelecionado) return;
          await onExcluirLead(leadSelecionado.id);
          setConfirmarExclusaoAberta(false);
        }}
      />
    </>
  );
}
